import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import styled from "styled-components";

const DialogHeaderContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  background-color: #f7fafc;
  -webkit-app-region: drag;
  user-select: none;
`;

const DialogTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
  flex: 1;
`;

const CloseButton = styled.button`
  -webkit-app-region: no-drag;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  color: #718096;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background-color: #e2e8f0;
    color: #2d3748;
  }

  &:active {
    background-color: #cbd5e0;
  }
`;

interface DialogHeaderProps {
  title: string;
  onClose: () => void;
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({ title, onClose }) => {
  return (
    <DialogHeaderContainer>
      <DialogTitle>{title}</DialogTitle>
      <CloseButton onClick={onClose} title="Close">
        <FontAwesomeIcon icon={faTimes} />
      </CloseButton>
    </DialogHeaderContainer>
  );
};

