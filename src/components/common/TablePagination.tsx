import React from 'react';
import { Pagination, PaginationProps } from './Pagination';

export type TablePaginationProps = PaginationProps;

export const TablePagination: React.FC<TablePaginationProps> = (props) => {
  return <Pagination {...props} />;
};

export default TablePagination;
