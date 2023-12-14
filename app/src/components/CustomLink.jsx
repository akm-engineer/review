import React from "react";
import { NavLink } from "react-router-dom";
export default function CustomLink({ to, children }) {
  return (
    <NavLink
      className="dark:text-dark-subtle text-light-subtle dark:hover:text-white hover:text-primary transition"
      to={to}
    >
      {children}
    </NavLink>
  );
}
