"""Calendar service for aggregating and managing calendar events."""

from typing import List, Dict, Any, Optional, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass
import calendar

from services.database_service import DatabaseService
from services.canvas_client import CanvasClient, CanvasConfig


@dataclass
class CalendarEvent:
    """Unified calendar event representation."""
    id: int
    title: str
    start_at: str
    end_at: Optional[str]
    event_type: str  # 'assignment' | 'event' | 'quiz'
    source: str  # 'canvas' | 'local'
    course_name: Optional[str] = None
    course_id: Optional[int] = None
    description: Optional[str] = None
    html_url: Optional[str] = None
    points_possible: Optional[float] = None
    canvas_id: Optional[int] = None


@dataclass
class SyncResult:
    """Result of calendar sync operation."""
    total_synced: int = 0
    new_events: int = 0
    updated_events: int = 0
    errors: List[str] = None

    def __post_init__(self):
        if self.errors is None:
            self.errors = []


class CalendarService:
    """Service for managing calendar events and views."""

    def __init__(
        self,
        db: DatabaseService,
        canvas_api_url: str,
        canvas_api_token: str
    ):
        self.db = db
        self.canvas_client = CanvasClient(CanvasConfig(
            api_url=canvas_api_url,
            api_token=canvas_api_token
        ))

    # =========================================================================
    # Calendar Sync from Canvas
    # =========================================================================

    def sync_calendar_events(
        self,
        start_date: str,
        end_date: str,
        context_codes: Optional[List[str]] = None,
        progress_callback: Optional[Callable[[str], None]] = None
    ) -> SyncResult:
        """
        Sync calendar events from Canvas for a date range.

        Args:
            start_date: Start date in ISO format
            end_date: End date in ISO format
            context_codes: Optional list of context codes (e.g., ['course_123', 'user_456'])
        """
        result = SyncResult()

        if progress_callback:
            progress_callback(f"Syncing calendar events from {start_date} to {end_date}...")

        try:
            events = self._get_canvas_calendar_events(
                start_date=start_date,
                end_date=end_date,
                context_codes=context_codes
            )

            for event in events:
                try:
                    event_data = {
                        "canvas_event_id": event.get("id"),
                        "title": event.get("title", "Untitled Event"),
                        "description": event.get("description"),
                        "start_at": event.get("start_at") or event.get("all_day_date"),
                        "end_at": event.get("end_at"),
                        "event_type": self._determine_event_type(event),
                        "context_code": event.get("context_code"),
                        "html_url": event.get("html_url")
                    }

                    # Check if exists
                    with self.db.get_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute(
                            "SELECT id FROM calendar_events WHERE canvas_event_id = ?",
                            (event_data["canvas_event_id"],)
                        )
                        existing = cursor.fetchone()

                    self.db.upsert_calendar_event(event_data)
                    result.total_synced += 1

                    if existing:
                        result.updated_events += 1
                    else:
                        result.new_events += 1

                except Exception as e:
                    result.errors.append(f"Failed to sync event: {str(e)}")

            if progress_callback:
                progress_callback(
                    f"Sync complete: {result.total_synced} events "
                    f"({result.new_events} new, {result.updated_events} updated)"
                )

        except Exception as e:
            result.errors.append(f"Sync failed: {str(e)}")

        return result

    def _get_canvas_calendar_events(
        self,
        start_date: str,
        end_date: str,
        context_codes: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Get calendar events from Canvas API."""
        params = {
            "start_date": start_date,
            "end_date": end_date,
            "per_page": 100
        }

        if context_codes:
            params["context_codes[]"] = context_codes

        return self.canvas_client._get_paginated("calendar_events", params)

    def _determine_event_type(self, event: Dict[str, Any]) -> str:
        """Determine the type of a calendar event."""
        event_type = event.get("type", "event").lower()

        if event_type == "assignment":
            return "assignment"
        elif "quiz" in event.get("title", "").lower():
            return "quiz"
        else:
            return "event"

    # =========================================================================
    # Calendar Event Aggregation
    # =========================================================================

    def get_events_in_range(
        self,
        start_date: str,
        end_date: str,
        include_assignments: bool = True,
        course_ids: Optional[List[int]] = None
    ) -> List[CalendarEvent]:
        """
        Get all calendar events in a date range.

        Combines calendar_events and assignments tables.
        """
        events = []

        # Get calendar events
        calendar_events = self.db.get_calendar_events(start_date, end_date)
        for event in calendar_events:
            events.append(CalendarEvent(
                id=event["id"],
                title=event["title"],
                start_at=event["start_at"],
                end_at=event.get("end_at"),
                event_type=event.get("event_type", "event"),
                source="canvas",
                description=event.get("description"),
                html_url=event.get("html_url"),
                canvas_id=event.get("canvas_event_id")
            ))

        # Get assignments
        if include_assignments:
            assignments = self.db.get_assignments(
                start_date=start_date,
                end_date=end_date
            )

            # Filter by course if specified
            if course_ids:
                assignments = [a for a in assignments if a["course_id"] in course_ids]

            for assignment in assignments:
                if assignment.get("due_at"):
                    events.append(CalendarEvent(
                        id=assignment["id"],
                        title=assignment["name"],
                        start_at=assignment["due_at"],
                        end_at=None,
                        event_type="assignment",
                        source="canvas",
                        course_name=assignment.get("course_name"),
                        course_id=assignment.get("course_id"),
                        description=assignment.get("description"),
                        html_url=assignment.get("html_url"),
                        points_possible=assignment.get("points_possible"),
                        canvas_id=assignment.get("canvas_assignment_id")
                    ))

        # Sort by start date
        events.sort(key=lambda x: x.start_at)

        return events

    def get_month_view(
        self,
        year: int,
        month: int,
        include_assignments: bool = True,
        course_ids: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        Get calendar data for a month view.

        Returns events grouped by day with month metadata.
        """
        # Calculate month boundaries
        _, last_day = calendar.monthrange(year, month)
        start_date = f"{year}-{month:02d}-01T00:00:00Z"
        end_date = f"{year}-{month:02d}-{last_day:02d}T23:59:59Z"

        events = self.get_events_in_range(
            start_date=start_date,
            end_date=end_date,
            include_assignments=include_assignments,
            course_ids=course_ids
        )

        # Group events by day
        events_by_day: Dict[int, List[Dict]] = {}
        for event in events:
            # Parse date
            date_str = event.start_at.split("T")[0]
            day = int(date_str.split("-")[2])

            if day not in events_by_day:
                events_by_day[day] = []

            events_by_day[day].append({
                "id": event.id,
                "title": event.title,
                "start_at": event.start_at,
                "end_at": event.end_at,
                "event_type": event.event_type,
                "source": event.source,
                "course_name": event.course_name,
                "course_id": event.course_id,
                "points_possible": event.points_possible
            })

        # Build calendar grid
        cal = calendar.Calendar(firstweekday=6)  # Sunday start
        weeks = []
        for week in cal.monthdatescalendar(year, month):
            week_data = []
            for day in week:
                if day.month == month:
                    week_data.append({
                        "day": day.day,
                        "date": day.isoformat(),
                        "events": events_by_day.get(day.day, []),
                        "is_current_month": True
                    })
                else:
                    week_data.append({
                        "day": day.day,
                        "date": day.isoformat(),
                        "events": [],
                        "is_current_month": False
                    })
            weeks.append(week_data)

        return {
            "year": year,
            "month": month,
            "month_name": calendar.month_name[month],
            "weeks": weeks,
            "total_events": len(events)
        }

    def get_week_view(
        self,
        date: Optional[str] = None,
        include_assignments: bool = True,
        course_ids: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        Get calendar data for a week view.

        Args:
            date: Any date in the desired week (ISO format), defaults to today
        """
        if date:
            target_date = datetime.fromisoformat(date.replace("Z", "+00:00")).date()
        else:
            target_date = datetime.now().date()

        # Find start of week (Sunday)
        days_since_sunday = (target_date.weekday() + 1) % 7
        week_start = target_date - timedelta(days=days_since_sunday)
        week_end = week_start + timedelta(days=6)

        start_date = f"{week_start.isoformat()}T00:00:00Z"
        end_date = f"{week_end.isoformat()}T23:59:59Z"

        events = self.get_events_in_range(
            start_date=start_date,
            end_date=end_date,
            include_assignments=include_assignments,
            course_ids=course_ids
        )

        # Group by day
        days = []
        for i in range(7):
            day = week_start + timedelta(days=i)
            day_events = [
                {
                    "id": e.id,
                    "title": e.title,
                    "start_at": e.start_at,
                    "end_at": e.end_at,
                    "event_type": e.event_type,
                    "source": e.source,
                    "course_name": e.course_name,
                    "course_id": e.course_id,
                    "points_possible": e.points_possible
                }
                for e in events
                if e.start_at.startswith(day.isoformat())
            ]

            days.append({
                "date": day.isoformat(),
                "day_name": calendar.day_name[day.weekday()],
                "day_short": calendar.day_abbr[day.weekday()],
                "is_today": day == datetime.now().date(),
                "events": day_events
            })

        return {
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "days": days,
            "total_events": len(events)
        }

    def get_upcoming_events(
        self,
        days: int = 7,
        include_assignments: bool = True,
        course_ids: Optional[List[int]] = None
    ) -> List[CalendarEvent]:
        """Get events in the next N days."""
        now = datetime.now()
        start_date = now.isoformat()
        end_date = (now + timedelta(days=days)).isoformat()

        return self.get_events_in_range(
            start_date=start_date,
            end_date=end_date,
            include_assignments=include_assignments,
            course_ids=course_ids
        )

    def get_day_events(
        self,
        date: str,
        include_assignments: bool = True,
        course_ids: Optional[List[int]] = None
    ) -> List[CalendarEvent]:
        """Get all events for a specific day."""
        # Ensure date is just the date part
        date_only = date.split("T")[0]
        start_date = f"{date_only}T00:00:00Z"
        end_date = f"{date_only}T23:59:59Z"

        return self.get_events_in_range(
            start_date=start_date,
            end_date=end_date,
            include_assignments=include_assignments,
            course_ids=course_ids
        )
