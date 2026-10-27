import React from 'react';
import { TablePagination, TablePaginationProps } from './TablePagination';

export type TableFooterProps = TablePaginationProps;

export const TableFooter: React.FC<TableFooterProps> = (props) => {
  return <TablePagination {...props} />;
};

export default TableFooter;
