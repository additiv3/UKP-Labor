import { NavLink, Route, Routes } from 'react-router-dom';
import { CalculatorScreen } from './CalculatorScreen';
import { D2FitScreen } from './fits/D2FitScreen';
import { IncubationScreen } from './fits/IncubationScreen';

/** Rechner mit Unterseiten: Parameter · D²-Fit · Inkubation. */
export function CalculatorRoot() {
  return (
    <>
      <nav className="subnav" aria-label="Rechner-Bereiche">
        <NavLink to="/rechner" end>
          Parameter
        </NavLink>
        <NavLink to="/rechner/d2">D²-Fit</NavLink>
        <NavLink to="/rechner/inkubation">Inkubation</NavLink>
      </nav>
      <Routes>
        <Route index element={<CalculatorScreen />} />
        <Route path="d2" element={<D2FitScreen />} />
        <Route path="inkubation" element={<IncubationScreen />} />
      </Routes>
    </>
  );
}
