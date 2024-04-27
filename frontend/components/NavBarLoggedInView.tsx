import { User } from "../models/user";
import * as CandidatesApi from "../network/candidate-api";
import { Button, Navbar } from "react-bootstrap";


interface NavBarLoggedInViewProps {
user: User;
onLogoutSuccessful: () => void;
}

export default function NavBarLoggedInView({ user, onLogoutSuccessful }: NavBarLoggedInViewProps) {

async function logout() {

  try {
    await CandidatesApi.logout();
    onLogoutSuccessful();
  } catch (error) {
    alert(error);
    console.error(error);
  }

}

  return (
    <>
    <Navbar.Text>

      Welcome, {user.username}!
    </Navbar.Text>
    <Button
    onClick={logout}
    >
    Log out
    </Button>
    </>
  )
}
