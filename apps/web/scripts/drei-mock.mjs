import React from 'react';

export const Html = ({ children, ...props }) => React.createElement('div', { 'data-drei-html': true, ...props }, children);
export const OrbitControls = () => null;
export const Environment = () => null;
export const Bounds = ({ children }) => children;
export const Center = ({ children }) => children;
export const ContactShadows = () => null;
export const Line = () => null;
export const useGLTF = () => ({ scene: null });

export default {
  Html,
  OrbitControls,
  Environment,
  Bounds,
  Center,
  ContactShadows,
  Line,
  useGLTF,
};
