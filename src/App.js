import React, { useState, useEffect, useRef, useCallback } from 'react';
import WireframeSphere from './components/WireframeSphere';
import StickFigure3D from './components/StickFigure3D';
import InsideSphereBackground from './components/InsideSphereBackground';
import './App.css';

// Section data configuration - Resume sections only (projects shown via buttons on landing)
const SECTIONS = [
  {
    id: 'amazon',
    shape: 'amazon',
    type: 'experience',
    company: 'Amazon',
    role: 'Software Development Engineer Co-op',
    period: 'April 2025 - Dec 2025',
    technologies: ['Kotlin', 'Python', 'AWS Fargate', 'AWS Bedrock', 'Coral', 'VPC'],
    bullets: [
      'Led end-to-end redesign and AWS migration of customer-facing currency-conversion service powering Prime Video, Audible, Kindle, Amazon Music, and Ring',
      'Built and scaled a high-availability backend service (Kotlin, Coral, AWS Fargate) handling 1M+ daily requests with autoscaling and fault isolation',
      'Implemented caching layers, reducing p99 latency by ~35%, eliminating 130+ annual compute hours, and cutting 37M downstream calls per year',
      'Designed production-grade infrastructure-as-code for CI/CD, monitoring, and alerting in a safety-critical payments environment',
      'Built a Knowledge Base generation tool on AWS Bedrock to dynamically index and vectorize internal documentation and code repositories',
      'Developed a Python-based LLM-powered documentation service leveraging embeddings and vector search on AWS Bedrock',
    ],
  },
  {
    id: 'cohere',
    shape: 'cohereHealth',
    type: 'experience',
    company: 'Cohere Health',
    role: 'Full Stack Software Engineer Intern',
    period: 'May 2024 - Nov 2024',
    technologies: ['TypeScript', 'React', 'Groovy', 'Grails', 'Agile'],
    bullets: [
      'Developed and enhanced features for a rules engine tool, resulting in a 500% increase in maximum searchable service requests (10K to 50K)',
      'Deployed a new UI enabling analysts to conduct more specific searches, reducing processing time for targeted queries by up to 30%',
      'Collaborated with decisioning and content teams to refine medical service request processing, contributing 50+ tickets',
      'Worked in an Agile format, delivering high-quality solutions under tight deadlines',
    ],
  },
  {
    id: 'nber',
    shape: 'nber',
    type: 'experience',
    company: 'National Bureau of Economic Research',
    role: 'Software Developer Intern',
    period: 'Jan 2024 - May 2024',
    technologies: ['React', 'Flask', 'Python', 'Data Visualization'],
    bullets: [
      'Automated NBER conference name-tag generation with a React-based tool, reducing preparation time from hours to seconds',
      'Designed a Flask backend to identify and visualize statistical trends across millions of server data points',
      'Enabled real-time insights for IT decision-making, impacting resource allocation and reducing unnecessary expenditure by thousands annually',
    ],
  },
  {
    id: 'northeastern',
    shape: 'northeastern',
    type: 'education',
    company: 'Northeastern University',
    role: 'B.S. in Computer Science (AI/ML)',
    period: 'Expected Aug 2026',
    technologies: ['Python', 'Java', 'PyTorch', 'Machine Learning'],
    bullets: [
      'CS Courses: Object Oriented Design, Algorithms & Data Structures, Computer Systems',
      'AI/ML Courses: Practical Neural Networks, Machine Learning 1 & 2, Artificial Intelligence',
      'Khoury College of Computer Sciences',
    ],
  },
  {
    id: 'skills-languages',
    shape: 'codeIcon',
    type: 'skills',
    company: 'Languages',
    role: 'Programming Languages',
    period: '',
    skills: [
      { name: 'Python', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg' },
      { name: 'JavaScript', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg' },
      { name: 'TypeScript', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg' },
      { name: 'Kotlin', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg' },
      { name: 'Java', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg' },
      { name: 'C/C++', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg' },
      { name: 'SQL', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg' },
      { name: 'HTML/CSS', icon: '/icons/html-code.svg' },
    ],
  },
  {
    id: 'skills-frameworks',
    shape: 'frameworkIcon',
    type: 'skills',
    company: 'Frameworks',
    role: 'Libraries & Frameworks',
    period: '',
    skills: [
      { name: 'React', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg' },
      { name: 'Node.js', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg' },
      { name: 'Express', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg' },
      { name: 'Flask', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flask/flask-original.svg' },
      { name: 'PyTorch', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pytorch/pytorch-original.svg' },
      { name: 'Django', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/django/django-plain.svg' },
      { name: 'Spring', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg' },
    ],
  },
  {
    id: 'skills-infra',
    shape: 'infraIcon',
    type: 'skills',
    company: 'Infrastructure & Tools',
    role: 'DevOps, Cloud & Databases',
    period: '',
    skills: [
      { name: 'AWS', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-plain-wordmark.svg' },
      { name: 'Docker', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg' },
      { name: 'Git', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg' },
      { name: 'PostgreSQL', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg' },
      { name: 'MongoDB', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg' },
      { name: 'NumPy', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/numpy/numpy-original.svg' },
      { name: 'Linux', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linux/linux-original.svg' },
    ],
  },
];

// Project data
const FULLSTACK_PROJECTS = [
  { id: 1, name: 'Project 1', description: 'Description coming soon' },
  { id: 2, name: 'Project 2', description: 'Description coming soon' },
  { id: 3, name: 'Project 3', description: 'Description coming soon' },
  { id: 4, name: 'Project 4', description: 'Description coming soon' },
];

const AIML_PROJECTS = [
  {
    id: 1,
    name: 'Vectorization Insight Tool',
    description: 'Interactive visualization of text chunking, embeddings, and vector similarity for RAG pipelines',
    url: 'https://vectors.zachhixson.me'
  },
  { id: 2, name: 'AI Project 2', description: 'Description coming soon' },
  { id: 3, name: 'AI Project 3', description: 'Description coming soon' },
];

// Marker positions for centered zoom (must match WireframeSphere LOGO_MARKERS)
const MARKER_POSITIONS = {
  'fullstack': { lat: 0, lon: 0 },
  'aiml': { lat: 0, lon: 180 },
  'amazon': { lat: 35, lon: 60 },
  'cohere': { lat: -25, lon: 120 },
  'nber': { lat: 30, lon: 240 },
  'northeastern': { lat: -20, lon: 300 },
  'skills-languages': { lat: -45, lon: 45 },
};

function App() {
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const [currentShape, setCurrentShape] = useState('sphere');
  const [hoveredButton, setHoveredButton] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const [expandedSection, setExpandedSection] = useState(null); // 'fullstack' or 'aiml' or null
  const [showButtons, setShowButtons] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hoveredProjectIndex, setHoveredProjectIndex] = useState(-1);
  const sectionRefs = useRef({});
  const appRef = useRef(null);

  // Globe world state
  const [isEnteringGlobe, setIsEnteringGlobe] = useState(false);
  const [isExitingGlobe, setIsExitingGlobe] = useState(false);
  const [globeScale, setGlobeScale] = useState(1);
  const [showInsideBackground, setShowInsideBackground] = useState(false);
  const [hoveredLogo, setHoveredLogo] = useState(null);
  const [zoomTarget, setZoomTarget] = useState(null); // { lat, lon } for centered zoom
  const [zoomProgress, setZoomProgress] = useState(0); // 0 to 1 for zoom animation
  const enterAnimationRef = useRef(null);
  const exitAnimationRef = useRef(null);

  // Mouse move handler for 3D perspective effect
  const handleMouseMove = useCallback((e) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    setMousePosition({ x, y });
  }, []);

  // Set up mouse tracking
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Handle return to landing (exit globe transition)
  const handleExitGlobe = useCallback(() => {
    if (isEnteringGlobe || isExitingGlobe || !showInsideBackground) return;

    setIsExitingGlobe(true);
    setShowInsideBackground(false); // Hide inside background immediately
    setCurrentShape('sphere'); // Return to sphere shape
    setGlobeScale(50); // Start from fully zoomed in
    setZoomProgress(1); // Start at end of zoom

    const startTime = Date.now();
    const duration = 1500; // Slower for dramatic exit (1.5 seconds)

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Update zoom progress (reverse direction)
      setZoomProgress(1 - progress);

      // Ease-out cubic for smooth pullback
      const eased = 1 - Math.pow(1 - progress, 3);
      const newScale = 50 - (50 - 1) * eased; // Zoom from 50x back to 1x
      setGlobeScale(newScale);

      if (progress < 1) {
        exitAnimationRef.current = requestAnimationFrame(animate);
      } else {
        // Transition complete
        setIsExitingGlobe(false);
        setShowInsideBackground(false);
        setGlobeScale(1);
        setZoomTarget(null);
        setZoomProgress(0);

        // Scroll back to landing
        if (appRef.current) {
          appRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    };

    exitAnimationRef.current = requestAnimationFrame(animate);
  }, [isEnteringGlobe, isExitingGlobe, showInsideBackground]);

  // Track consecutive overscroll attempts (wheel up at top)
  const overscrollCountRef = useRef(0);
  // Track scroll down attempts in outer mode
  const scrollDownCountRef = useRef(0);

  // Handle scroll-down entry in outer world mode (zoom into center)
  const handleScrollDownEntry = useCallback(() => {
    if (isEnteringGlobe || isExitingGlobe || showInsideBackground) return;

    // Set zoom target to center (no specific marker)
    setZoomTarget({ lat: 0, lon: 0 });
    setZoomProgress(0);
    setIsEnteringGlobe(true);

    const startTime = Date.now();
    const duration = 1800; // Same as marker click

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      setZoomProgress(progress);

      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const newScale = 1 + (50 - 1) * eased;
      setGlobeScale(newScale);

      if (progress < 1) {
        enterAnimationRef.current = requestAnimationFrame(animate);
      } else {
        setIsEnteringGlobe(false);
        setShowInsideBackground(true);
        setGlobeScale(1);
        setZoomTarget(null);
        setZoomProgress(0);
        setCurrentShape('fullstack');
        setShowButtons(true);
        if (appRef.current) {
          appRef.current.scrollTo({ top: 0, behavior: 'instant' });
        }
      }
    };

    enterAnimationRef.current = requestAnimationFrame(animate);
  }, [isEnteringGlobe, isExitingGlobe, showInsideBackground]);

  // Wheel event handler for entry/exit detection
  useEffect(() => {
    const appElement = appRef.current;
    if (!appElement) return;

    const handleWheel = (e) => {
      // OUTER MODE: Scroll down to enter inner globe mode
      if (!showInsideBackground && !isEnteringGlobe && !isExitingGlobe) {
        if (e.deltaY > 0) {
          scrollDownCountRef.current++;
          // Require 3 scroll-down attempts to enter
          if (scrollDownCountRef.current >= 3) {
            scrollDownCountRef.current = 0;
            handleScrollDownEntry();
          }
        } else {
          scrollDownCountRef.current = 0;
        }
        return;
      }

      // INNER MODE: Scroll up at top to exit
      if (showInsideBackground && !isEnteringGlobe && !isExitingGlobe) {
        const scrollY = appElement.scrollTop;
        const isAtTop = scrollY < 5;

        if (isAtTop && e.deltaY < 0) {
          overscrollCountRef.current++;
          if (overscrollCountRef.current >= 3) {
            overscrollCountRef.current = 0;
            handleExitGlobe();
          }
        } else {
          overscrollCountRef.current = 0;
        }
      }
    };

    appElement.addEventListener('wheel', handleWheel, { passive: true });
    return () => appElement.removeEventListener('wheel', handleWheel);
  }, [showInsideBackground, isEnteringGlobe, isExitingGlobe, handleExitGlobe, handleScrollDownEntry]);

  // Scroll handler for section detection and button visibility (NO exit logic here)
  useEffect(() => {
    const appElement = appRef.current;
    if (!appElement) return;

    const handleScroll = () => {
      const scrollY = appElement.scrollTop;
      const windowHeight = window.innerHeight;

      // With snap scrolling, we check if we're past the landing section
      const isAtLanding = scrollY < windowHeight * 0.5;

      // Check if scrolled past landing
      setScrolled(!isAtLanding);

      // Determine which section is currently in view
      let foundSection = null;

      SECTIONS.forEach((section) => {
        const el = sectionRefs.current[section.id];
        if (el) {
          const rect = el.getBoundingClientRect();
          // Section is "active" when its top is near the viewport top (within snap tolerance)
          if (rect.top >= -100 && rect.top <= 100) {
            foundSection = section;
          }
        }
      });

      if (foundSection) {
        setActiveSection(foundSection.id);
        setShowButtons(false); // Hide buttons when in sections
        if (!hoveredButton && !expandedSection) {
          setCurrentShape(foundSection.shape);
        }
      } else if (isAtLanding) {
        setActiveSection(null);
        setShowButtons(true); // Show buttons when at landing
        if (!hoveredButton && !expandedSection) {
          // In inner globe mode, default to fullstack; in outer mode, show sphere
          setCurrentShape(showInsideBackground ? 'fullstack' : 'sphere');
        }
      }
    };

    appElement.addEventListener('scroll', handleScroll);
    // Initial check
    handleScroll();
    return () => appElement.removeEventListener('scroll', handleScroll);
  }, [hoveredButton, expandedSection, showInsideBackground]);

  // Intersection Observer for section visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sectionId = entry.target.dataset.section;
          setVisibleSections((prev) => {
            const next = new Set(prev);
            if (entry.isIntersecting) {
              next.add(sectionId);
            }
            return next;
          });
        });
      },
      { threshold: 0.2 }
    );

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Handle button hover
  const handleButtonHover = (shape) => {
    if (expandedSection) return; // Don't change shape if expanded
    setHoveredButton(shape);
    setCurrentShape(shape);
  };

  const handleButtonLeave = () => {
    if (expandedSection) return; // Don't change shape if expanded
    setHoveredButton(null);
    // Restore shape based on current section or default
    if (activeSection) {
      const section = SECTIONS.find((s) => s.id === activeSection);
      if (section) {
        setCurrentShape(section.shape);
      }
    } else {
      setCurrentShape('sphere');
    }
  };

  // Handle button click to expand project list
  const handleButtonClick = (type) => {
    if (expandedSection === type) {
      // Collapse if clicking the same section
      setExpandedSection(null);
      setCurrentShape('sphere');
    } else {
      // Show the icon shape and expand - keep the icon visible in background
      const iconShape = type === 'fullstack' ? 'fullstack' : 'neuralNetwork';
      setCurrentShape(iconShape);

      // After morph completes, set expanded section (icon stays visible via backgroundShape prop)
      setTimeout(() => {
        setExpandedSection(type);
        // Keep the icon shape - don't switch to the old geometric expanded shapes
      }, 800); // Wait for morph animation to complete
    }
  };

  // Handle back button click
  const handleBackClick = () => {
    setExpandedSection(null);
    setCurrentShape('sphere');
  };

  // Handle project hover
  const handleProjectHover = (index) => {
    setHoveredProjectIndex(index);
  };

  const handleProjectLeave = () => {
    setHoveredProjectIndex(-1);
  };

  // Track which project was clicked for redirect after transition
  const [pendingProjectUrl, setPendingProjectUrl] = useState(null);

  // Handle project click - trigger hyperspace transition
  const handleProjectClick = (project) => {
    setIsTransitioning(true);
    setHoveredProjectIndex(-1);
    if (project.url) {
      setPendingProjectUrl(project.url);
    }
  };

  // Handle transition complete
  const handleTransitionComplete = () => {
    setIsTransitioning(false);
    setExpandedSection(null);
    setCurrentShape('sphere');
    // Redirect to project page if one was clicked
    if (pendingProjectUrl) {
      window.location.href = pendingProjectUrl;
    }
  };

  // Handle logo hover on globe
  const handleLogoHover = useCallback((logoId) => {
    setHoveredLogo(logoId);
  }, []);

  // Handle logo click - start "enter the globe" transition
  const handleLogoClick = useCallback((logoId) => {
    if (isEnteringGlobe || isExitingGlobe) return;

    setIsEnteringGlobe(true);
    setHoveredLogo(null);

    // Set zoom target to center on clicked marker
    const markerPos = MARKER_POSITIONS[logoId] || { lat: 0, lon: 0 };
    setZoomTarget(markerPos);
    setZoomProgress(0);

    // Check if this is a project marker (goes to landing) or resume section
    const isProjectMarker = logoId === 'fullstack' || logoId === 'aiml';
    const targetSection = SECTIONS.find(s => s.id === logoId);

    // Set shape: project markers show fullstack, resume sections show their shape
    const targetShape = isProjectMarker ? 'fullstack' : (targetSection ? targetSection.shape : 'fullstack');

    const startTime = Date.now();
    const duration = 1800; // Slower for more dramatic effect (1.8 seconds)

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Update zoom progress for WireframeSphere
      setZoomProgress(progress);

      // Ease-in-out cubic for smooth dramatic effect
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Scale to 50x for full-screen coverage
      const newScale = 1 + (50 - 1) * eased;
      setGlobeScale(newScale);

      if (progress < 1) {
        enterAnimationRef.current = requestAnimationFrame(animate);
      } else {
        // Transition complete - enter inner globe mode
        setIsEnteringGlobe(false);
        setShowInsideBackground(true);
        setGlobeScale(1); // Reset scale for inner view
        setZoomTarget(null);
        setZoomProgress(0);
        setCurrentShape(targetShape);

        if (isProjectMarker) {
          // Project markers: go to landing page with buttons visible
          setShowButtons(true);
          if (appRef.current) {
            appRef.current.scrollTo({ top: 0, behavior: 'instant' });
          }
        } else {
          // Resume section markers: scroll to that section
          setShowButtons(false);
          setTimeout(() => {
            const targetEl = sectionRefs.current[logoId];
            if (targetEl && appRef.current) {
              targetEl.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        }
      }
    };

    enterAnimationRef.current = requestAnimationFrame(animate);
  }, [isEnteringGlobe, isExitingGlobe]);

  // Cleanup animation frames on unmount
  useEffect(() => {
    return () => {
      if (enterAnimationRef.current) cancelAnimationFrame(enterAnimationRef.current);
      if (exitAnimationRef.current) cancelAnimationFrame(exitAnimationRef.current);
    };
  }, []);

  // Determine if sphere should spin (only when showing sphere shape and not interacting)
  const shouldSpin = currentShape === 'sphere' && !hoveredButton && !expandedSection && !isEnteringGlobe && !isExitingGlobe;

  // Determine if markers should show (hide during transitions and when zoomed in)
  const showMarkers = !isEnteringGlobe && !isExitingGlobe && !showInsideBackground && globeScale < 2;

  return (
    <div className="app" ref={appRef}>
      {/* Background grid effect */}
      <div className="background-grid" />

      {/* Scanline overlay for retro effect */}
      <div className="scanline" />

      {/* Inside sphere background for section pages */}
      <InsideSphereBackground visible={showInsideBackground && !isExitingGlobe} />

      {/* The central 3D wireframe sphere - always visible */}
      <WireframeSphere
        currentShape={currentShape}
        mousePosition={mousePosition}
        isSpinning={shouldSpin}
        backgroundShape={expandedSection === 'fullstack' ? 'fullstack' : expandedSection === 'aiml' ? 'neuralNetwork' : null}
        hoveredProjectIndex={hoveredProjectIndex}
        isTransitioning={isTransitioning}
        onTransitionComplete={handleTransitionComplete}
        scale={isExitingGlobe ? globeScale : (isEnteringGlobe ? globeScale : 1)}
        onLogoClick={handleLogoClick}
        onLogoHover={handleLogoHover}
        hoveredLogo={hoveredLogo}
        showMarkers={showMarkers && !showInsideBackground}
        enableDrag={!expandedSection && !isTransitioning && !showInsideBackground && !isEnteringGlobe && !isExitingGlobe}
        zoomTarget={zoomTarget}
        zoomProgress={zoomProgress}
        isZooming={isEnteringGlobe || isExitingGlobe}
      />

      {/* Wireframe stick figure walking around */}
      <StickFigure3D
        visible={!scrolled && !expandedSection && !showInsideBackground && !isEnteringGlobe}
        screenBounds={{ left: 80, right: Math.min(window.innerWidth * 0.35, 450) }}
      />

      {/* Back to Globe button removed - exit via scroll instead */}

      {/* Expanded Project List Overlay */}
      {expandedSection && (
        <div className={`expanded-overlay ${isTransitioning ? 'fading' : ''}`}>
          {/* Back button */}
          <button className="back-button" onClick={handleBackClick}>
            Back
          </button>

          {/* Project list */}
          <div className="project-list">
            {(expandedSection === 'fullstack' ? FULLSTACK_PROJECTS : AIML_PROJECTS).map((project, index) => (
              <div
                key={project.id}
                className={`project-item ${hoveredProjectIndex === index ? 'hovered' : ''}`}
                style={{ animationDelay: `${index * 0.1}s` }}
                onMouseEnter={() => handleProjectHover(index)}
                onMouseLeave={handleProjectLeave}
                onClick={() => handleProjectClick(project)}
              >
                <span className="project-name">{project.name}</span>
                <span className="project-desc">{project.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Landing Section */}
      <section className="landing-section">
        <h1 className="hero-title">
          Zach Hixson
          <span className="hero-subtitle">Software Engineer</span>
        </h1>

        {/* Navigation Buttons - only visible in inner globe mode */}
        <nav className={`nav-buttons ${scrolled ? 'scrolled' : ''} ${!showInsideBackground || !showButtons || expandedSection ? 'hidden' : ''}`}>
          <button
            className="cyber-button wireframe-button"
            data-text="Fullstack Projects"
            onMouseEnter={() => handleButtonHover('fullstack')}
            onMouseLeave={handleButtonLeave}
            onClick={() => handleButtonClick('fullstack')}
          >
            Fullstack Projects
          </button>
          <button
            className="cyber-button wireframe-button"
            data-text="AI/ML Projects"
            onMouseEnter={() => handleButtonHover('neuralNetwork')}
            onMouseLeave={handleButtonLeave}
            onClick={() => handleButtonClick('aiml')}
          >
            AI/ML Projects
          </button>
        </nav>

        {/* Scroll indicator - only visible in inner globe mode */}
        <div className={`scroll-indicator ${!showInsideBackground || expandedSection ? 'hidden' : ''}`}>
          Scroll
        </div>

        {/* Outer globe indicator - only visible in outer globe mode */}
        <div className={`outer-indicator ${showInsideBackground || isEnteringGlobe || isExitingGlobe ? 'hidden' : ''}`}>
          Scroll or Select an Icon
        </div>
      </section>

      {/* Resume Sections */}
      <div className="resume-container">
        {SECTIONS.map((section, index) => (
          <section
            key={section.id}
            ref={(el) => (sectionRefs.current[section.id] = el)}
            className={`resume-section ${section.type === 'education' ? 'education-section' : ''} ${section.type === 'skills' ? 'skills-section' : ''} ${section.type === 'projects' ? 'projects-section' : ''} ${visibleSections.has(section.id) ? 'visible' : ''}`}
            data-section={section.id}
          >
            <div className="section-content">
              <div className="section-header">
                <div className="section-icon">
                  {section.type === 'education' ? '🎓' : section.type === 'skills' ? '⚡' : section.type === 'projects' ? '🚀' : '💼'}
                </div>
                <div>
                  <h2 className="section-title">{section.company}</h2>
                  <p className="section-subtitle">
                    {section.role}{section.period && ` | ${section.period}`}
                  </p>
                </div>
              </div>
              {section.technologies && (
                <div className="tech-tags">
                  {section.technologies.map((tech, i) => (
                    <span key={i} className="tech-tag">{tech}</span>
                  ))}
                </div>
              )}
              {section.projects ? (
                <div className="projects-grid">
                  {section.projects.map((project, i) => (
                    <div key={i} className="project-card">
                      <h3 className="project-name">{project.name}</h3>
                      <p className="project-description">{project.description}</p>
                      <div className="project-tech">
                        {project.tech.map((t, j) => (
                          <span key={j} className="tech-tag">{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : section.skills ? (
                <div className="skills-grid">
                  {section.skills.map((skill, i) => (
                    <div key={i} className="skill-card">
                      <img src={skill.icon} alt={skill.name} className="skill-icon" />
                      <span className="skill-name">{skill.name}</span>
                    </div>
                  ))}
                </div>
              ) : section.bullets ? (
                <div className="section-body">
                  <ul>
                    {section.bullets.map((bullet, i) => (
                      <li key={i}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      {/* Category labels on the side */}
      <div className={`category-label ${activeSection && SECTIONS.find(s => s.id === activeSection)?.type === 'experience' ? 'visible' : ''}`}>
        Experience
      </div>

    </div>
  );
}

export default App;
