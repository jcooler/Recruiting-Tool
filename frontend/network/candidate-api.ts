import { Candidate } from "../models/candidate";
import { User } from "../models/user";

async function fetchData(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  if (response.ok) {
    return response;
  } else {
    const errorBody = await response.json();
    const errorMessage = errorBody.message;
    throw Error(errorMessage);
  }
}

export async function getLoggedInUser(): Promise<Candidate> {
  const response = await fetchData("http://localhost:5001/api/users/", {
    method: "GET",
  });
  return await response.json();
}

export interface SignUpCredentials {

  username: string;
  email: string;
  password: string;

}

export async function signUp(credentials: SignUpCredentials): Promise<User> {
  const response = await fetchData("http://localhost:5001/api/users/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });
  return response.json();
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export async function login(credentials: LoginCredentials): Promise<User> {
  const response = await fetchData("http://localhost:5001/api/users/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });
  return response.json();
}

export async function logout() {
await fetchData("http://localhost:5001/api/users/logout", {

method: "POST",

});
}

export async function fetchCandidates(): Promise<Candidate> {
  const response = await fetchData("http://localhost:5001/api/candidates/", {
    method: "GET",
  });
  return await response.json();
}

export interface CandidateInput {
  name: string;
  email: string;
  status?: string;
  phone?: string;
  address?: string;
  skills?: string[];
  experience?: number;
  education?: string;
  certifications?: string[];
  desiredPay?: string;
  typeOfEmployment?: string[];
  desiredWorkLocation?: string[];
  notes?: string;
}

export async function createCandidate(
  candidate: CandidateInput
): Promise<Candidate> {
  const response = await fetchData("http://localhost:5001/api/candidates/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(candidate),
  });
  return response.json();
}

export async function updateCandidate(
  candidateId: string,
  candidate: CandidateInput
): Promise<Candidate> {
  const response = await fetchData(
    "http://localhost:5001/api/candidates/" + candidateId,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(candidate),
    }
  );
  return response.json();
}

export async function deleteCandidate(candidateId: string) {
  await fetchData("http://localhost:5001/api/candidates/" + candidateId, {
    method: "DELETE",
  });
}
