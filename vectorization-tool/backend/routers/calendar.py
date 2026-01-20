"""Calendar API router."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from services.database_service import DatabaseService
from services.calendar_service import CalendarService


router = APIRouter()


# Request/Response Models
class CalendarEventResponse(BaseModel):
    id: int
    title: str
    start_at: str
    end_at: Optional[str]
    event_type: str
    source: str
    course_name: Optional[str]
    course_id: Optional[int]
    description: Optional[str]
    html_url: Optional[str]
    points_possible: Optional[float]
    canvas_id: Optional[int]


class DayData(BaseModel):
    day: int
    date: str
    events: List[dict]
    is_current_month: bool


class WeekData(BaseModel):
    date: str
    day_name: str
    day_short: str
    is_today: bool
    events: List[dict]


class MonthViewResponse(BaseModel):
    year: int
    month: int
    month_name: str
    weeks: List[List[dict]]
    total_events: int


class WeekViewResponse(BaseModel):
    week_start: str
    week_end: str
    days: List[dict]
    total_events: int


class SyncRequest(BaseModel):
    start_date: str = Field(..., description="Start date in ISO format")
    end_date: str = Field(..., description="End date in ISO format")
    context_codes: Optional[List[str]] = Field(
        default=None,
        description="Canvas context codes (e.g., ['course_123'])"
    )


class SyncResponse(BaseModel):
    total_synced: int
    new_events: int
    updated_events: int
    errors: List[str]


# Helper functions
def _get_db(request: Request) -> DatabaseService:
    settings = request.app.state.settings
    return DatabaseService(db_path=getattr(settings, 'db_path', './data/canvas_tracker.db'))


def _get_calendar_service(request: Request) -> CalendarService:
    settings = request.app.state.settings
    db = _get_db(request)
    return CalendarService(
        db=db,
        canvas_api_url=settings.canvas_api_url,
        canvas_api_token=settings.canvas_api_token
    )


def _event_to_response(event) -> dict:
    """Convert CalendarEvent to response dict."""
    return {
        "id": event.id,
        "title": event.title,
        "start_at": event.start_at,
        "end_at": event.end_at,
        "event_type": event.event_type,
        "source": event.source,
        "course_name": event.course_name,
        "course_id": event.course_id,
        "description": event.description,
        "html_url": event.html_url,
        "points_possible": event.points_possible,
        "canvas_id": event.canvas_id
    }


# Endpoints
@router.get("/events", response_model=List[CalendarEventResponse])
async def get_events(
    request: Request,
    start_date: str,
    end_date: str,
    include_assignments: bool = True,
    course_ids: Optional[str] = None
):
    """Get calendar events in a date range."""
    try:
        service = _get_calendar_service(request)

        # Parse course_ids if provided
        course_id_list = None
        if course_ids:
            course_id_list = [int(cid) for cid in course_ids.split(",")]

        events = service.get_events_in_range(
            start_date=start_date,
            end_date=end_date,
            include_assignments=include_assignments,
            course_ids=course_id_list
        )

        return [_event_to_response(e) for e in events]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/month/{year}/{month}", response_model=MonthViewResponse)
async def get_month_view(
    request: Request,
    year: int,
    month: int,
    include_assignments: bool = True,
    course_ids: Optional[str] = None
):
    """Get calendar data for a month view."""
    try:
        if not (1 <= month <= 12):
            raise HTTPException(status_code=400, detail="Month must be between 1 and 12")

        service = _get_calendar_service(request)

        # Parse course_ids if provided
        course_id_list = None
        if course_ids:
            course_id_list = [int(cid) for cid in course_ids.split(",")]

        result = service.get_month_view(
            year=year,
            month=month,
            include_assignments=include_assignments,
            course_ids=course_id_list
        )

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/week", response_model=WeekViewResponse)
async def get_week_view(
    request: Request,
    date: Optional[str] = None,
    include_assignments: bool = True,
    course_ids: Optional[str] = None
):
    """Get calendar data for a week view."""
    try:
        service = _get_calendar_service(request)

        # Parse course_ids if provided
        course_id_list = None
        if course_ids:
            course_id_list = [int(cid) for cid in course_ids.split(",")]

        result = service.get_week_view(
            date=date,
            include_assignments=include_assignments,
            course_ids=course_id_list
        )

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/day/{date}", response_model=List[CalendarEventResponse])
async def get_day_events(
    request: Request,
    date: str,
    include_assignments: bool = True,
    course_ids: Optional[str] = None
):
    """Get all events for a specific day."""
    try:
        service = _get_calendar_service(request)

        # Parse course_ids if provided
        course_id_list = None
        if course_ids:
            course_id_list = [int(cid) for cid in course_ids.split(",")]

        events = service.get_day_events(
            date=date,
            include_assignments=include_assignments,
            course_ids=course_id_list
        )

        return [_event_to_response(e) for e in events]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/upcoming", response_model=List[CalendarEventResponse])
async def get_upcoming_events(
    request: Request,
    days: int = 7,
    include_assignments: bool = True,
    course_ids: Optional[str] = None
):
    """Get upcoming events in the next N days."""
    try:
        service = _get_calendar_service(request)

        # Parse course_ids if provided
        course_id_list = None
        if course_ids:
            course_id_list = [int(cid) for cid in course_ids.split(",")]

        events = service.get_upcoming_events(
            days=days,
            include_assignments=include_assignments,
            course_ids=course_id_list
        )

        return [_event_to_response(e) for e in events]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync", response_model=SyncResponse)
async def sync_calendar_events(
    request: Request,
    sync_request: SyncRequest
):
    """Sync calendar events from Canvas."""
    try:
        service = _get_calendar_service(request)

        result = service.sync_calendar_events(
            start_date=sync_request.start_date,
            end_date=sync_request.end_date,
            context_codes=sync_request.context_codes
        )

        return SyncResponse(
            total_synced=result.total_synced,
            new_events=result.new_events,
            updated_events=result.updated_events,
            errors=result.errors
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
