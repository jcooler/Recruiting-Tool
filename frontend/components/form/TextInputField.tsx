import { Form } from "react-bootstrap";
import { UseFormRegister, FieldError, RegisterOptions, } from "react-hook-form";
import styles from "@/styles/TextInputField.module.css";

interface TextInputFieldProps {
name: string,
label: string,
register: UseFormRegister<any>,
registerOptions?: RegisterOptions,
error?: FieldError,
options?: { value: string; label: string }[];
type?: string,
[x: string]: any,
}

export default function TextInputField( {name, label, register, registerOptions, error, options, type = "text", ...props}: TextInputFieldProps) {
  return (
    <Form.Group controlId={name + "-input"} className={styles.textInputField}>
      <Form.Label>{label}</Form.Label>
      {type === "select" ? (
        <Form.Control
          as="select"
          {...register(name, registerOptions)}
          isInvalid={!!error}
          {...props}
        >
          {options &&
            options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
        </Form.Control>
      ) : (
        <Form.Control
          type={type}
          {...props}
          {...register(name, registerOptions)}
          isInvalid={!!error}
        />
      )}
      <Form.Control.Feedback type="invalid">
        {error?.message}
      </Form.Control.Feedback>
    </Form.Group>
  )
}
