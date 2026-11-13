// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { NumberInput } from './NumberInput';

afterEach(cleanup);

function Harness({ onSI }: { onSI: (v: number | undefined) => void }) {
  const [v, setV] = useState<number | undefined>(50e-6);
  const [u, setU] = useState('µJ');
  return (
    <NumberInput
      label="Pulsenergie"
      quantity="energy"
      value={v}
      unit={u}
      onUnitChange={setU}
      onChange={(x) => {
        setV(x);
        onSI(x);
      }}
    />
  );
}

describe('NumberInput', () => {
  it('zeigt SI-Wert in gewählter Einheit, akzeptiert Komma', () => {
    const onSI = vi.fn();
    render(<Harness onSI={onSI} />);
    const input = screen.getByLabelText('Pulsenergie') as HTMLInputElement;
    expect(input.value).toBe('50');
    fireEvent.change(input, { target: { value: '12,5' } });
    expect(onSI).toHaveBeenLastCalledWith(expect.closeTo(12.5e-6, 15));
    expect(input.value).toBe('12,5');
  });

  it('leere Eingabe → undefined', () => {
    const onSI = vi.fn();
    render(<Harness onSI={onSI} />);
    fireEvent.change(screen.getByLabelText('Pulsenergie'), { target: { value: '' } });
    expect(onSI).toHaveBeenLastCalledWith(undefined);
  });

  it('Einheitenwechsel rechnet Anzeige um, SI bleibt', () => {
    const onSI = vi.fn();
    render(<Harness onSI={onSI} />);
    fireEvent.change(screen.getByLabelText('Einheit Pulsenergie'), { target: { value: 'mJ' } });
    expect((screen.getByLabelText('Pulsenergie') as HTMLInputElement).value).toBe('0,05');
    expect(onSI).not.toHaveBeenCalled();
  });

  it('ungültige Eingabe wird markiert', () => {
    render(<Harness onSI={() => {}} />);
    fireEvent.change(screen.getByLabelText('Pulsenergie'), { target: { value: '1,2,3' } });
    expect(screen.getByText('Keine gültige Zahl')).toBeTruthy();
  });
});
