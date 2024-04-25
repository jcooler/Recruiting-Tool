import Head from "next/head";
import { Inter } from "next/font/google";
import NavBar from "@/components/NavBar";
import { useState, useEffect } from "react";
import { User } from "@/models/user";
import * as CandidatesApi from "@/network/candidate-api";
import LoginModal from "@/components/LoginModal";
import SignUp from "@/components/SignUp";
import CandidateLoggedInView from "@/components/CandidateLoggedInView";
import CandidateLoggedOutView from "@/components/CandidateLoggedOutView";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    async function fetchLoggedInUser() {
      try {
        const user = await CandidatesApi.getLoggedInUser();
        setLoggedInUser(user);
      } catch (error) {
        console.error(error);
      }
    }
    fetchLoggedInUser();
  }, []);

  return (
    <>
      <Head>
        <title>Applicant Wizard</title>
        <meta
          name="description"
          content="Applicant Wizard is the leading Applicant Tracking System built with Next.js"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <link
          rel="icon"
          href="/favicon.ico"
        />
      </Head>
      <NavBar
        loggedInUser={loggedInUser}
        onSignUpClicked={() => setShowSignUp(true)}
        onLoginClicked={() => setShowLogin(true)}
        onLogoutSuccessful={() => setLoggedInUser(null)}
      />

      <>
        {loggedInUser ? <CandidateLoggedInView /> : <CandidateLoggedOutView />}
      </>

      {showSignUp && (
        <SignUp
          onDismiss={() => setShowSignUp(false)}
          onSignupSuccess={(user) => {

            setLoggedInUser(user);
            setShowSignUp(false);
          }}
        />
      )}
      {showLogin && (
        <LoginModal
          onDismiss={() => setShowLogin(false)}
          onLoginSuccess={(user) => {
            setLoggedInUser(user);
            setShowLogin(false);
          }}
        />
      )}
    </>
  );
}
