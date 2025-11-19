import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFolderOpen,
  faSearch,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";

const FABContainer = styled.div`
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1000;
`;

const FABMainButton = styled.div<{ expanded: boolean }>`
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background-color: ${({ expanded }) => (expanded ? "white" : "#1976d2")};
  color: ${({ expanded }) => (expanded ? "#1976d2" : "white")};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 3px 5px -1px rgba(0, 0, 0, 0.2),
    0 6px 10px 0 rgba(0, 0, 0, 0.14), 0 1px 18px 0 rgba(0, 0, 0, 0.12);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: ${({ expanded }) => (expanded ? "scale(1.1)" : "scale(1)")};

  &:hover {
    background-color: ${({ expanded }) => (expanded ? "#f5f5f5" : "#1565c0")};
    box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2),
      0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12);
  }

  &:active {
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.2), 0 1px 1px 0 rgba(0, 0, 0, 0.14),
      0 2px 1px -1px rgba(0, 0, 0, 0.12);
  }
`;

const FABMainButtonLabel = styled.div<{ expanded: boolean }>`
  position: absolute;
  right: 64px;
  background-color: rgba(0, 0, 0, 0.87);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  opacity: ${({ expanded }) => (expanded ? 1 : 0)};
  transform: ${({ expanded }) =>
    expanded ? "translateX(0)" : "translateX(-10px)"};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: ${({ expanded }) => (expanded ? "100ms" : "0ms")};
`;

const FABOptionsContainer = styled.div<{ expanded: boolean }>`
  position: absolute;
  bottom: 64px;
  right: 0;
  display: flex;
  flex-direction: column-reverse;
  gap: 16px;
  align-items: center;
  opacity: ${({ expanded }) => (expanded ? 1 : 0)};
  pointer-events: ${({ expanded }) => (expanded ? "auto" : "none")};
  transform: ${({ expanded }) =>
    expanded ? "translateY(0)" : "translateY(20px)"};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const FABOption = styled.div<{ delay: number; expanded: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background-color: white;
  color: #1976d2;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 3px 5px -1px rgba(0, 0, 0, 0.2),
    0 6px 10px 0 rgba(0, 0, 0, 0.14), 0 1px 18px 0 rgba(0, 0, 0, 0.12);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: ${({ delay, expanded }) =>
    expanded ? `${delay * 50}ms` : "0ms"};
  transform: ${({ expanded }) => (expanded ? "scale(1)" : "scale(0)")}
    translateY(${({ expanded }) => (expanded ? "0" : "20px")});

  &:hover {
    background-color: #f5f5f5;
    box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2),
      0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12);
  }

  &:active {
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.2), 0 1px 1px 0 rgba(0, 0, 0, 0.14),
      0 2px 1px -1px rgba(0, 0, 0, 0.12);
  }
`;

const FABOptionLabel = styled.div<{ expanded: boolean; delay: number }>`
  position: absolute;
  right: 64px;
  background-color: rgba(0, 0, 0, 0.87);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  opacity: ${({ expanded }) => (expanded ? 1 : 0)};
  transform: ${({ expanded }) =>
    expanded ? "translateX(0)" : "translateX(-10px)"};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: ${({ delay, expanded }) =>
    expanded ? `${delay * 50 + 100}ms` : "0ms"};
`;

type FABOptionType = "catalog" | "explorer";

interface FABButtonProps {
  onCatalogClick: () => void;
  onExplorerClick: () => void;
}

const STORAGE_KEY = "lastFabSelection";

export const FABButton: React.FC<FABButtonProps> = ({
  onCatalogClick,
  onExplorerClick,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [lastSelection, setLastSelection] = useState<FABOptionType>("explorer");
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load last selection from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "catalog" || stored === "explorer") {
      setLastSelection(stored);
    }
  }, []);

  const handleMainClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (expanded) {
      // When expanded, execute the last action
      if (lastSelection === "catalog") {
        onCatalogClick();
      } else {
        onExplorerClick();
      }
      setExpanded(false);
    } else {
      // When not expanded, just open the menu (handled by onMouseEnter)
      setExpanded(true);
    }
  };

  const handleOptionClick = (
    e: React.MouseEvent,
    option: FABOptionType,
    handler: () => void
  ) => {
    e.stopPropagation();
    setLastSelection(option);
    localStorage.setItem(STORAGE_KEY, option);
    setExpanded(false);
    handler();
  };

  // Handle mouse enter with immediate open
  const handleMouseEnter = () => {
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setExpanded(true);
  };

  // Handle mouse leave with delay to prevent closing during fast movement
  const handleMouseLeave = () => {
    // Clear any existing timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    // Set a delay before closing to allow moving between elements
    closeTimeoutRef.current = setTimeout(() => {
      setExpanded(false);
      closeTimeoutRef.current = null;
    }, 200); // 200ms delay to allow smooth movement
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Close on click outside (but not on the FAB itself)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setExpanded(false);
      }
    };

    if (expanded) {
      // Use a small delay to avoid closing immediately when clicking
      const timeoutId = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [expanded]);

  // Handle wheel event on main button to switch between actions
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only handle when expanded
    if (!expanded) return;

    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    // Switch selection based on wheel direction
    const newSelection: FABOptionType =
      lastSelection === "catalog" ? "explorer" : "catalog";
    setLastSelection(newSelection);
    localStorage.setItem(STORAGE_KEY, newSelection);
  };

  // Get the alternative option (the one that is NOT the last selection)
  const alternativeOption: {
    type: FABOptionType;
    icon: typeof faFolderOpen | typeof faSearch;
    label: string;
    handler: () => void;
  } =
    lastSelection === "catalog"
      ? {
          type: "explorer",
          icon: faSearch,
          label: "Find in USGS Explorer",
          handler: onExplorerClick,
        }
      : {
          type: "catalog",
          icon: faFolderOpen,
          label: "Add from Catalog",
          handler: onCatalogClick,
        };

  // Get the main button label (last selection)
  const mainButtonLabel =
    lastSelection === "catalog" ? "Add from Catalog" : "Find in USGS Explorer";

  return (
    <FABContainer
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <FABOptionsContainer expanded={expanded}>
        <div style={{ position: "relative" }}>
          <FABOptionLabel expanded={expanded} delay={0}>
            {alternativeOption.label}
          </FABOptionLabel>
          <FABOption
            expanded={expanded}
            delay={0}
            onClick={(e) =>
              handleOptionClick(
                e,
                alternativeOption.type,
                alternativeOption.handler
              )
            }
            onMouseEnter={handleMouseEnter}
          >
            <FontAwesomeIcon icon={alternativeOption.icon} />
          </FABOption>
        </div>
      </FABOptionsContainer>
      <div style={{ position: "relative" }} onWheel={handleWheel}>
        <FABMainButtonLabel expanded={expanded}>
          {mainButtonLabel}
        </FABMainButtonLabel>
        <FABMainButton
          expanded={expanded}
          onClick={handleMainClick}
          onScroll={(e) => e.stopPropagation()}
        >
          <FontAwesomeIcon
            icon={
              expanded
                ? lastSelection === "catalog"
                  ? faFolderOpen
                  : faSearch
                : faPlus
            }
            size="lg"
          />
        </FABMainButton>
      </div>
    </FABContainer>
  );
};
