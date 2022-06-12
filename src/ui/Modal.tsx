import React, { useState } from "react";
import { ReactChild } from "react";

interface IModal {
  title: ReactChild;
  body: ReactChild;
  footer: ReactChild;
}

export interface IModalControl {
  showModal(props: IModal): void;
  hideModal(): void;
}

export const ModalWrapper = ({
  children,
}: {
  children: (props: IModalControl) => ReactChild;
}) => {
  const [showModal, setShowModal] = useState<IModal>(null);
  return (
    <>
      {children({
        showModal: setShowModal,
        hideModal: () => setShowModal(null),
      })}
      {showModal && <Modal {...showModal} />}
    </>
  );
};

const Modal = ({ title, body, footer }: IModal) => {
  return (
    <div className="modal">
      <div>{title}</div>
      <div>{body}</div>
      <div>{footer}</div>
    </div>
  );
};
