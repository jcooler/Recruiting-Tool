import { Candidate} from "../models/candidate";
import { User } from "../models/user";
import { UnauthorizedError, ConflictError } from "../errors/https_errors";

const baseUrl = "https://recruiting-tool-api.vercel.app";

function initFetch(init?: RequestInit): RequestInit {
  // Ensure headers are always defined as an object
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  return {
    ...init,
    headers: headers,
    credentials: 'include',  // Include cookies with the request
  };
}

async function fetchData(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(baseUrl + input, initFetch(init));
  if (!response.ok) {
    const errorBody = await response.json();
    const errorMessage = errorBody.error || 'Unknown error occurred';

    switch (response.status) {
      case 401:
        throw new UnauthorizedError(errorMessage);
      case 409:
        throw new ConflictError(errorMessage);
      default:
        throw new Error(`Request failed with status: ${response.status} message: ${errorMessage}`);
    }
  }
  return response;
}

export async function getLoggedInUser(): Promise<User> {
  const response = await fetchData("/api/users", {
    method: "GET"
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
    body: JSON.stringify(credentials)
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
    body: JSON.stringify(credentials)
  });
  return response.json();
}

export async function logout() {
  await fetchData("/api/users/logout", {
    method: "POST"
  });
}

export async function fetchCandidates(): Promise<Candidate[]> {
  const response = await fetchData("/api/candidates", {
    method: "GET"
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

export async function createCandidate(candidate: CandidateInput): Promise<Candidate> {
  const response = await fetchData("/api/candidates", {
    method: "POST",
    body: JSON.stringify(candidate)
  });
  return response.json();
}

export async function updateCandidate(candidateId: string, candidate: CandidateInput): Promise<Candidate> {
  const response = await fetchData("/api/candidates/" + candidateId, {
    method: "PATCH",
    body: JSON.stringify(candidate)
  });
  return response.json();
}

export async function deleteCandidate(candidateId: string) {
  await fetchData("/api/candidates/" + candidateId, {
    method: "DELETE"
  });
}
