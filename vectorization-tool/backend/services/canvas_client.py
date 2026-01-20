"""Comprehensive Canvas LMS API client with deep recursive file discovery."""

import re
import requests
from typing import List, Dict, Any, Optional, Set, Callable
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class CanvasFile:
    """Represents a file found in Canvas."""
    id: int
    filename: str
    display_name: str
    size: int
    url: str
    content_type: str
    course_id: int
    course_name: str
    source: str  # Where the file was found
    modified_at: Optional[str] = None
    folder_path: Optional[str] = None


@dataclass
class CanvasConfig:
    """Canvas API configuration."""
    api_url: str
    api_token: str


class CanvasClient:
    """Comprehensive Canvas LMS client with deep recursive file discovery."""

    SUPPORTED_EXTENSIONS = {
        '.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt', '.md',
        '.py', '.r', '.rmd', '.ipynb', '.html', '.htm', '.json',
        '.csv', '.xlsx', '.xls', '.tex', '.java', '.c', '.cpp', '.h',
        '.js', '.ts', '.sql', '.xml', '.yaml', '.yml'
    }

    SKIP_PATTERNS = [
        r'udoit\.json',  # Canvas accessibility checker
        r'\.DS_Store',
        r'thumbs\.db',
    ]

    def __init__(self, config: CanvasConfig):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {config.api_token}",
            "Accept": "application/json"
        })
        self._seen_file_ids: Set[int] = set()

    def _get(self, endpoint: str, params: Optional[Dict] = None) -> Any:
        """Make GET request to Canvas API."""
        url = f"{self.config.api_url}/{endpoint}"
        response = self.session.get(url, params=params, timeout=30)
        response.raise_for_status()
        return response.json()

    def _get_paginated(self, endpoint: str, params: Optional[Dict] = None) -> List[Any]:
        """Get all pages of a paginated endpoint."""
        results = []
        url = f"{self.config.api_url}/{endpoint}"
        params = params or {}
        params["per_page"] = 100

        while url:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            if isinstance(data, list):
                results.extend(data)
            else:
                results.append(data)

            # Check for next page
            links = response.headers.get("Link", "")
            url = None
            for link in links.split(","):
                if 'rel="next"' in link:
                    url = link.split(";")[0].strip("<> ")
                    params = {}
                    break

        return results

    def _should_skip_file(self, filename: str) -> bool:
        """Check if file should be skipped."""
        for pattern in self.SKIP_PATTERNS:
            if re.search(pattern, filename, re.IGNORECASE):
                return True
        return False

    def _is_supported_file(self, filename: str) -> bool:
        """Check if file extension is supported."""
        ext = Path(filename).suffix.lower()
        return ext in self.SUPPORTED_EXTENSIONS

    def _file_to_canvas_file(
        self,
        file_data: Dict,
        course_id: int,
        course_name: str,
        source: str
    ) -> Optional[CanvasFile]:
        """Convert API file data to CanvasFile object."""
        filename = file_data.get("display_name") or file_data.get("filename", "")

        if self._should_skip_file(filename):
            return None

        if not self._is_supported_file(filename):
            return None

        file_id = file_data.get("id")
        if file_id in self._seen_file_ids:
            return None

        self._seen_file_ids.add(file_id)

        return CanvasFile(
            id=file_id,
            filename=file_data.get("filename", filename),
            display_name=filename,
            size=file_data.get("size", 0),
            url=file_data.get("url", ""),
            content_type=file_data.get("content-type", ""),
            course_id=course_id,
            course_name=course_name,
            source=source,
            modified_at=file_data.get("modified_at") or file_data.get("updated_at"),
            folder_path=file_data.get("folder_path")
        )

    # =========================================================================
    # Course Discovery
    # =========================================================================

    def get_courses(self, favorites_only: bool = False) -> List[Dict[str, Any]]:
        """Get all courses for the authenticated user."""
        if favorites_only:
            return self._get_paginated("users/self/favorites/courses")
        return self._get_paginated("courses", {"enrollment_state": "active"})

    def get_course(self, course_id: int) -> Dict[str, Any]:
        """Get a specific course."""
        return self._get(f"courses/{course_id}")

    def search_courses(self, search_terms: List[str]) -> List[Dict[str, Any]]:
        """Search for courses matching any of the search terms."""
        all_courses = self.get_courses()
        matched = []

        for course in all_courses:
            course_code = course.get("course_code", "").lower()
            course_name = course.get("name", "").lower()

            for term in search_terms:
                term_lower = term.lower()
                if term_lower in course_code or term_lower in course_name:
                    matched.append(course)
                    break

        return matched

    # =========================================================================
    # Deep Recursive File Discovery
    # =========================================================================

    def discover_all_files(
        self,
        course_id: int,
        include_assignments: bool = False,
        progress_callback: Optional[Callable[[str], None]] = None
    ) -> List[CanvasFile]:
        """
        Recursively discover ALL files in a course.

        Searches:
        - Files section (all folders recursively)
        - Modules (all items)
        - Pages (embedded file links)
        - Assignments (if include_assignments=True)
        - Announcements
        - Discussions
        """
        self._seen_file_ids.clear()
        files: List[CanvasFile] = []

        try:
            course = self.get_course(course_id)
            course_name = course.get("name", f"Course {course_id}")
        except Exception:
            course_name = f"Course {course_id}"

        # 1. Files section (recursive through all folders)
        if progress_callback:
            progress_callback(f"[{course_name}] Scanning Files section...")
        files.extend(self._discover_files_section(course_id, course_name))

        # 2. Modules
        if progress_callback:
            progress_callback(f"[{course_name}] Scanning Modules...")
        files.extend(self._discover_module_files(course_id, course_name))

        # 3. Pages
        if progress_callback:
            progress_callback(f"[{course_name}] Scanning Pages...")
        files.extend(self._discover_page_files(course_id, course_name))

        # 4. Assignments (optional)
        if include_assignments:
            if progress_callback:
                progress_callback(f"[{course_name}] Scanning Assignments...")
            files.extend(self._discover_assignment_files(course_id, course_name))

        # 5. Announcements
        if progress_callback:
            progress_callback(f"[{course_name}] Scanning Announcements...")
        files.extend(self._discover_announcement_files(course_id, course_name))

        # 6. Discussions
        if progress_callback:
            progress_callback(f"[{course_name}] Scanning Discussions...")
        files.extend(self._discover_discussion_files(course_id, course_name))

        if progress_callback:
            progress_callback(f"[{course_name}] Found {len(files)} files")

        return files

    def _discover_files_section(self, course_id: int, course_name: str) -> List[CanvasFile]:
        """Recursively get all files from the Files section."""
        files = []

        try:
            # Get all folders first
            folders = self._get_paginated(f"courses/{course_id}/folders")

            for folder in folders:
                folder_id = folder.get("id")
                folder_path = folder.get("full_name", "")

                # Get files in this folder
                try:
                    folder_files = self._get_paginated(f"folders/{folder_id}/files")
                    for f in folder_files:
                        f["folder_path"] = folder_path
                        canvas_file = self._file_to_canvas_file(
                            f, course_id, course_name, f"files:{folder_path}"
                        )
                        if canvas_file:
                            files.append(canvas_file)
                except Exception:
                    pass

        except Exception:
            # Fallback: try direct files endpoint
            try:
                all_files = self._get_paginated(f"courses/{course_id}/files")
                for f in all_files:
                    canvas_file = self._file_to_canvas_file(
                        f, course_id, course_name, "files"
                    )
                    if canvas_file:
                        files.append(canvas_file)
            except Exception:
                pass

        return files

    def _discover_module_files(self, course_id: int, course_name: str) -> List[CanvasFile]:
        """Get all files from modules."""
        files = []

        try:
            modules = self._get_paginated(f"courses/{course_id}/modules")

            for module in modules:
                module_name = module.get("name", "Unknown")
                module_id = module.get("id")

                try:
                    items = self._get_paginated(
                        f"courses/{course_id}/modules/{module_id}/items"
                    )

                    for item in items:
                        if item.get("type") == "File":
                            file_id = item.get("content_id")
                            if file_id:
                                try:
                                    file_data = self._get(f"files/{file_id}")
                                    canvas_file = self._file_to_canvas_file(
                                        file_data, course_id, course_name,
                                        f"module:{module_name}"
                                    )
                                    if canvas_file:
                                        files.append(canvas_file)
                                except Exception:
                                    pass

                        elif item.get("type") == "Page":
                            # Also check pages linked in modules
                            page_url = item.get("page_url")
                            if page_url:
                                page_files = self._extract_files_from_page(
                                    course_id, page_url, course_name,
                                    f"module:{module_name}/page"
                                )
                                files.extend(page_files)

                except Exception:
                    pass

        except Exception:
            pass

        return files

    def _discover_page_files(self, course_id: int, course_name: str) -> List[CanvasFile]:
        """Get all files linked in pages."""
        files = []

        try:
            pages = self._get_paginated(f"courses/{course_id}/pages")

            for page in pages:
                page_url = page.get("url")
                page_title = page.get("title", "Unknown")

                if page_url:
                    page_files = self._extract_files_from_page(
                        course_id, page_url, course_name, f"page:{page_title}"
                    )
                    files.extend(page_files)

        except Exception:
            pass

        return files

    def _extract_files_from_page(
        self,
        course_id: int,
        page_url: str,
        course_name: str,
        source: str
    ) -> List[CanvasFile]:
        """Extract file links from a page's HTML content."""
        files = []

        try:
            page = self._get(f"courses/{course_id}/pages/{page_url}")
            body = page.get("body", "")

            if not body:
                return files

            # Find file IDs in various patterns
            patterns = [
                r'data-api-endpoint="[^"]*files/(\d+)"',
                r'/files/(\d+)',
                r'file_id["\s:=]+(\d+)',
            ]

            found_ids = set()
            for pattern in patterns:
                matches = re.findall(pattern, body)
                found_ids.update(matches)

            for file_id in found_ids:
                try:
                    file_data = self._get(f"files/{file_id}")
                    canvas_file = self._file_to_canvas_file(
                        file_data, course_id, course_name, source
                    )
                    if canvas_file:
                        files.append(canvas_file)
                except Exception:
                    pass

        except Exception:
            pass

        return files

    def _discover_assignment_files(self, course_id: int, course_name: str) -> List[CanvasFile]:
        """Get files attached to assignments (not submissions)."""
        files = []

        try:
            assignments = self._get_paginated(f"courses/{course_id}/assignments")

            for assignment in assignments:
                assignment_name = assignment.get("name", "Unknown")

                # Check description for file links
                description = assignment.get("description", "")
                if description:
                    # Extract file IDs from description HTML
                    file_ids = re.findall(r'/files/(\d+)', description)
                    file_ids.extend(re.findall(r'data-api-endpoint="[^"]*files/(\d+)"', description))

                    for file_id in set(file_ids):
                        try:
                            file_data = self._get(f"files/{file_id}")
                            canvas_file = self._file_to_canvas_file(
                                file_data, course_id, course_name,
                                f"assignment:{assignment_name}"
                            )
                            if canvas_file:
                                files.append(canvas_file)
                        except Exception:
                            pass

        except Exception:
            pass

        return files

    def _discover_announcement_files(self, course_id: int, course_name: str) -> List[CanvasFile]:
        """Get files attached to announcements."""
        files = []

        try:
            announcements = self._get_paginated(
                f"courses/{course_id}/discussion_topics",
                {"only_announcements": "true"}
            )

            for ann in announcements:
                ann_title = ann.get("title", "Unknown")
                message = ann.get("message", "")

                if message:
                    file_ids = re.findall(r'/files/(\d+)', message)
                    file_ids.extend(re.findall(r'data-api-endpoint="[^"]*files/(\d+)"', message))

                    for file_id in set(file_ids):
                        try:
                            file_data = self._get(f"files/{file_id}")
                            canvas_file = self._file_to_canvas_file(
                                file_data, course_id, course_name,
                                f"announcement:{ann_title}"
                            )
                            if canvas_file:
                                files.append(canvas_file)
                        except Exception:
                            pass

                # Check attachments
                for attachment in ann.get("attachments", []):
                    canvas_file = self._file_to_canvas_file(
                        attachment, course_id, course_name,
                        f"announcement:{ann_title}"
                    )
                    if canvas_file:
                        files.append(canvas_file)

        except Exception:
            pass

        return files

    def _discover_discussion_files(self, course_id: int, course_name: str) -> List[CanvasFile]:
        """Get files attached to discussions."""
        files = []

        try:
            discussions = self._get_paginated(
                f"courses/{course_id}/discussion_topics",
                {"only_announcements": "false"}
            )

            for disc in discussions:
                disc_title = disc.get("title", "Unknown")
                message = disc.get("message", "")

                if message:
                    file_ids = re.findall(r'/files/(\d+)', message)
                    file_ids.extend(re.findall(r'data-api-endpoint="[^"]*files/(\d+)"', message))

                    for file_id in set(file_ids):
                        try:
                            file_data = self._get(f"files/{file_id}")
                            canvas_file = self._file_to_canvas_file(
                                file_data, course_id, course_name,
                                f"discussion:{disc_title}"
                            )
                            if canvas_file:
                                files.append(canvas_file)
                        except Exception:
                            pass

                # Check attachments
                for attachment in disc.get("attachments", []):
                    canvas_file = self._file_to_canvas_file(
                        attachment, course_id, course_name,
                        f"discussion:{disc_title}"
                    )
                    if canvas_file:
                        files.append(canvas_file)

        except Exception:
            pass

        return files

    # =========================================================================
    # File Download
    # =========================================================================

    def download_file(self, canvas_file: CanvasFile, download_dir: str) -> Optional[str]:
        """Download a file and return its local path."""
        if not canvas_file.url:
            return None

        # Create course subdirectory
        safe_course_name = re.sub(r'[^\w\-_]', '_', canvas_file.course_name)[:50]
        course_dir = Path(download_dir) / safe_course_name
        course_dir.mkdir(parents=True, exist_ok=True)

        local_path = course_dir / canvas_file.display_name

        # Skip if already downloaded
        if local_path.exists() and local_path.stat().st_size == canvas_file.size:
            return str(local_path)

        try:
            response = self.session.get(canvas_file.url, stream=True, timeout=60)
            response.raise_for_status()

            with open(local_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            return str(local_path)

        except Exception:
            return None

    # =========================================================================
    # Assignment & Calendar Methods
    # =========================================================================

    def get_assignments(self, course_id: int) -> List[Dict[str, Any]]:
        """Get all assignments for a course with full metadata."""
        return self._get_paginated(f"courses/{course_id}/assignments")

    def get_calendar_events(
        self,
        start_date: str,
        end_date: str,
        context_codes: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get calendar events for a date range.

        Args:
            start_date: Start date in ISO format (e.g., '2024-01-01')
            end_date: End date in ISO format
            context_codes: Optional list of context codes (e.g., ['course_123', 'user_456'])
        """
        params = {
            "start_date": start_date,
            "end_date": end_date
        }

        if context_codes:
            params["context_codes[]"] = context_codes

        return self._get_paginated("calendar_events", params)

    def get_upcoming_assignments(
        self,
        course_ids: Optional[List[int]] = None,
        favorites_only: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get upcoming assignments (due in the future) for specified courses.

        If no course_ids provided, gets from favorited courses only (by default).
        Set favorites_only=False to get from all active courses.
        """
        if course_ids:
            courses = [{"id": cid} for cid in course_ids]
        else:
            courses = self.get_courses(favorites_only=favorites_only)

        assignments = []
        for course in courses:
            try:
                course_assignments = self.get_assignments(course["id"])
                # Filter to only include upcoming (due_at is in the future or null)
                from datetime import datetime
                now = datetime.utcnow().isoformat() + "Z"
                for a in course_assignments:
                    if a.get("due_at") is None or a.get("due_at") > now:
                        a["course_id"] = course["id"]
                        a["course_name"] = course.get("name", f"Course {course['id']}")
                        assignments.append(a)
            except Exception:
                pass

        # Sort by due date
        assignments.sort(key=lambda x: x.get("due_at") or "9999")
        return assignments
