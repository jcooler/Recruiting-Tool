import { User } from "@/models/user";
import { useForm } from "react-hook-form";
import { SignUpCredentials } from "@/network/candidate-api";
import * as CandidatesApi from "@/network/candidate-api";
import { Modal, Form, Button } from "react-bootstrap";
import TextInputField from "@/components/form/TextInputField";
import styleUtils from "@/styles/utils.module.css";


interface SignUpProps {
  onDismiss: () => void;
  onSignupSuccess: (user: User) => void;
}

export default function SignUp({ onDismiss, onSignupSuccess }: SignUpProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpCredentials>();

  async function onSubmit(credentials: SignUpCredentials) {
    try {
      const newUser = await CandidatesApi.signUp(credentials);
      onSignupSuccess(newUser);
    } catch (error) {
      alert(error);
      console.error(error);
    }
  }

  return (
    <Modal
      show={true}
      onHide={onDismiss}>
      <Modal.Header closeButton>
        <Modal.Title>Sign Up</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <TextInputField
            name="username"
            label="Username"
            type="text"
            placeholder="Enter username"
            register={register}
            registerOptions={{ required: "Username is required" }}
            error={errors.username}
          />
          <TextInputField
            name="email"
            label="Email"
            type="email"
            placeholder="Enter email"
            register={register}
            registerOptions={{ required: "Email is required" }}
            error={errors.email}
          />
          <TextInputField
            name="password"
            label="Password"
            type="password"
            placeholder="Enter password"
            register={register}
            registerOptions={{ required: "Password is required" }}
            error={errors.password}
          />
          <Button
            type="submit"
            disabled={isSubmitting}
            className={styleUtils.width100}
            >
            Sign Up
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
