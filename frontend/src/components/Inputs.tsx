import { IconType } from "react-icons";
import { FaUser } from "react-icons/fa";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface InputWithIconProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: IconType | React.ComponentType<{ className?: string }>;
  type?: "text" | "textarea" | "password" | "email" | "number";
  className?: string;
  inputClassName?: string;
  iconClassName?: string;
  disabled?: boolean;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  showCharCount?: boolean;
  rows?: number;
  onKeyDown?: (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
}

const InputWithIcon: React.FC<InputWithIconProps> = ({
  label,
  value,
  onChange,
  placeholder = "",
  icon: Icon = FaUser,
  type = "text",
  className = "",
  inputClassName = "",
  disabled = false,
  iconClassName = disabled ? "text-foreground/50" : "text-primary",
  maxLength,
  showCharCount = false,
  required = true,
  minLength = 2,
  rows = 3,
  onKeyDown,
}: InputWithIconProps) => {
  const [charCount, setCharCount] = useState(value.length ? value.length : 0);
  const [remainingChars, setRemainingChars] = useState(
    maxLength ? maxLength - value.length : null
  );

  useEffect(() => {
    setCharCount(value.length);
    if (maxLength) {
      setRemainingChars(maxLength - value.length);
    }
  }, [value, maxLength]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (maxLength && e.target.value.length > maxLength) return;
    onChange(e.target.value);
  };

  return (
    <div className={`${className}`}>
      <div className="flex justify-between items-center mb-2">
        <label className="block text-foreground/50 text-sm font-medium">
          {label}
        </label>
        {maxLength && showCharCount && (
          <span
            className={`text-xs ${
              remainingChars !== null && remainingChars < 10
                ? "text-yellow-500"
                : remainingChars !== null && remainingChars < 0
                ? "text-destructive"
                : "text-foreground/50"
            }`}
          >
            {remainingChars !== null
              ? `${remainingChars} caractères restants`
              : `${charCount} caractères`}
          </span>
        )}
      </div>

      <div className="relative">
        {type === "textarea" ? (
          <motion.div className="relative">
            <motion.textarea
              disabled={disabled}
              value={value}
              onChange={handleChange}
              placeholder={placeholder}
              rows={rows}
              maxLength={maxLength}
              required={required}
              className={`w-full border tracking-widest disabled:bg-primary/30 disabled:text-foreground border-border rounded-lg px-4 py-2 
                placeholder-foreground/50 focus:outline-none focus:ring-2 text-foreground focus:ring-primary/50
                pl-12 transition-all duration-200 ${inputClassName}`}
              onKeyDown={onKeyDown}
            />
            <motion.div className="absolute left-3 top-3">
              <Icon size={15} className={`${iconClassName}`} />
            </motion.div>
          </motion.div>
        ) : (
          <motion.input
            type={type}
            disabled={disabled}
            value={value}
            onChange={handleChange}
            required={required}
            minLength={minLength}
            placeholder={placeholder}
            maxLength={maxLength}
            className={`w-full border tracking-widest disabled:bg-primary/30 disabled:text-foreground border-border rounded-lg px-4 py-2 
              placeholder-foreground/50 focus:outline-none focus:ring-2 text-foreground focus:ring-primary/50
              pl-12 transition-all duration-200 ${inputClassName}`}
            onKeyDown={onKeyDown}
          />
        )}

        {type !== "textarea" && (
          <motion.div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Icon size={15} className={`${iconClassName}`} />
          </motion.div>
        )}
      </div>

      {/* Barre de progression pour le comptage de caractères */}
      {maxLength && (
        <div className="mt-1 h-1 bg-accent/10 rounded-full overflow-hidden">
          <div
            className={`h-full ${
              remainingChars !== null && remainingChars < 0
                ? "bg-destructive"
                : remainingChars !== null && remainingChars < maxLength * 0.1
                ? "bg-yellow-500"
                : "bg-primary"
            }`}
            style={{
              width: `${Math.min(
                100,
                Math.max(0, (charCount / maxLength) * 100)
              )}%`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default InputWithIcon;
