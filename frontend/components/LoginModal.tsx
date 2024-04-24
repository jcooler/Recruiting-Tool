import { User } from '@/models/user';
import { LoginCredentials } from '@/network/candidate-api';
import { useForm } from 'react-hook-form';
import * as CandidatesApi from '@/network/candidate-api';
import { Modal, Form, Button } from 'react-bootstrap';
import TextInputField from '@/components/form/TextInputField';
import styleUtils from '@/styles/utils.module.css';

interface LoginModalProps {
onDismiss: () => void;
onLoginSuccess: (user: User) => void;
}

export default function LoginModal({ onDismiss, onLoginSuccess }: LoginModalProps) {

  const { register, handleSubmit, formState: {errors, isSubmitting} } = useForm<LoginCredentials>();


  async function onSubmit(credentials: LoginCredentials) {

    try {
      const user = await CandidatesApi.login(credentials);
      onLoginSuccess(user);
    } catch (error) {
      alert(error);
      console.error(error);
    }

  }

  return (
    <Modal show onHide={onDismiss}>
<Modal.Header closeButton>
<Modal.Title>Login</Modal.Title>
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
className={styleUtils.btn}
>
Login
</Button>
</Form>
</Modal.Body>
      </Modal>
  )
}
