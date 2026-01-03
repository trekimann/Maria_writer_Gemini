import React, { forwardRef, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import {
  formatDDMMYYYYHHMMSSFromDate,
  parseDDMMYYYYHHMMSS,
} from '../../utils/date';

type Props = {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  placeholder?: string;
};

const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextInput(props, ref) {
    return <input ref={ref} {...props} />;
  }
);

export const DateTimeInput: React.FC<Props> = ({ value, onChange, className, placeholder }) => {
  const selected = useMemo(() => {
    if (!value) return null;
    return parseDDMMYYYYHHMMSS(value);
  }, [value]);

  return (
    <DatePicker
      selected={selected}
      onChange={(date: Date | null) => {
        if (!date) {
          onChange('');
          return;
        }

        // Ensure deterministic seconds when picking from the UI.
        const next = new Date(date);
        next.setSeconds(0, 0);
        onChange(formatDDMMYYYYHHMMSSFromDate(next));
      }}
      onChangeRaw={(event) => {
        if (!event) return;
        const target = event.target as HTMLInputElement;
        const input = target.value;
        if (!input) {
          onChange('');
          return;
        }
        
        // Parse manually typed dates in dd/mm/yyyy format
        const parsed = parseDDMMYYYYHHMMSS(input);
        if (parsed) {
          onChange(formatDDMMYYYYHHMMSSFromDate(parsed));
          event.preventDefault(); // Prevent default parsing
        }
      }}
      showTimeSelect
      timeIntervals={1}
      dateFormat="dd/MM/yyyy HH:mm:ss"
      placeholderText={placeholder ?? 'dd/MM/yyyy HH:mm:ss'}
      customInput={<TextInput className={className} />}
      isClearable
    />
  );
};
