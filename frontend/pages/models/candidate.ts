export interface Candidate {
_id: string,
name: string,
email: string,
phone?: string,
address?: string,
skills?: string[],
education?: string,
certifications?: string[],
desiredPay?: string,
typeOfEmployment?: string[],
desiredWorkLocation?: string[],
status?: string,
createdAt: string,
updatedAt: string
}