import React from 'react';
import clsx from 'clsx';

const Card = ({
  children,
  className = '',
  hover = false,
  padding = 'md',
  ...props
}) => {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div
      className={clsx(
        'border border-gray-200 bg-white',
        hover && 'hover:border-gray-300 transition-colors duration-150 cursor-pointer',
        paddings[padding],
        className
      )}
      {...props}>
      
      {children}
    </div>);

};

export default Card;