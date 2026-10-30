import React, { ReactNode, CSSProperties } from 'react';
import { Offcanvas as CommonOffcanvas } from '../common/Offcanvas';

interface OffcanvasProps {
  show: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  width?: string;
  bodyClassName?: string;
  bodyStyle?: CSSProperties;
}

export function Offcanvas({
  show,
  onClose,
  title,
  children,
  width = '400px',
  bodyClassName = 'd-flex flex-column p-0',
  bodyStyle = {},
}: OffcanvasProps) {
  return (
    <CommonOffcanvas
      isOpen={show}
      onClose={onClose}
      title={title}
      width={width}
      bodyClassName={bodyClassName}
      bodyStyle={{ padding: 0, ...bodyStyle }}
    >
      {children}
    </CommonOffcanvas>
  );
}

export default Offcanvas;

