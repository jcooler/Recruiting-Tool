import { Candidate } from "../models/candidate";
import { User } from "../models/user";
import { UnauthorizedError, ConflictError } from "../errors/https_errors";

async function fetchData(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  if (response.ok) {
    return response;
  } else {
    const errorBody = await response.json();
    const errorMessage = errorBody.error;

    if (response.status === 401) {
      throw new UnauthorizedError(errorMessage);
    } else if (response.status === 409) {
      throw new ConflictError(errorMessage);
    } else {
      throw Error(
        "Request failed with status: " +
          response.status +
          " message:" +
          errorMessage
      );
    }
  }
}

export async function getLoggedInUser(): Promise<User> {
  const response = await fetchData("/api/users", {
    method: "GET",
  });
  return response.json();
}

export interface SignUpCredentials {
  username: string;
  email: string;
  password: string;
}

export async function signUp(credentials: SignUpCredentials): Promise<User> {
  const response = await fetchData("/api/users/signup", {
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
  const response = await fetchData("/api/users/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });
  return response.json();
}

export async function logout() {
  await fetchData("/api/users/logout", {
    method: "POST",
  });
}

export async function fetchCandidates(): Promise<Candidate[]> {
  const response = await fetchData("/api/candidates", {
    method: "GET",
  });
  return response.json();
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
  const response = await fetchData("/api/candidates", {
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
  const response = await fetchData("/api/candidates/" + candidateId, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(candidate),
  });
  return response.json();
}

export async function deleteCandidate(candidateId: string) {
  await fetchData("/api/candidates/" + candidateId, {
    method: "DELETE",
  });
}
