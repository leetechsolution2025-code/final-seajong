import React from 'react';
import { CasioCalculator, CasioCalculatorProps } from '../common/CasioCalculator';

export type CalculatorModalProps = CasioCalculatorProps;

export const CalculatorModal: React.FC<CalculatorModalProps> = (props) => {
  return <CasioCalculator {...props} />;
};

export default CalculatorModal;
