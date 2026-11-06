interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled = false }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label || 'Toggle'}
      className={`switch ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
      disabled={disabled}
    >
      <span className="switch-thumb" />
    </button>
  );
}
