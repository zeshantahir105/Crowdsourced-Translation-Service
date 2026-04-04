import { getSourceLanguageOptions, getTargetLanguageOptions } from "../langs";

type Props = {
  variant: "source" | "target";
  value: string;
  onChange: (code: string) => void;
  className?: string;
};

export function LanguageSelect({ variant, value, onChange, className }: Props) {
  const { groups } = variant === "source" ? getSourceLanguageOptions() : getTargetLanguageOptions();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      {groups.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
