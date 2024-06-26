import { RequestHandler } from "express";
import candidateModel from "../models/candidate";
import createHttpError from "http-errors";
import mongoose from "mongoose";
import { assertIsDefined } from "../util/assertIsDefined";


//* Get all candidates
export const getCandidates: RequestHandler = async (req, res, next) => {

  const authenticatedUserId = req.session.userId;
  //! try/catch w/ next(error) necessary until express 5.0 release. Express 5.0 will have built-in error handling
  try {
    assertIsDefined(authenticatedUserId);
    const candidates = await candidateModel.find({userId: authenticatedUserId}).exec();
    res.status(200).json(candidates);
  } catch (error) {
    next(error);
  }
};
export const getCandidate: RequestHandler = async (req, res, next) => {
const candidateId = req.params.candidateId;
const authenticatedUserId = req.session.userId;
try {
assertIsDefined(authenticatedUserId);
  if (!mongoose.isValidObjectId(candidateId)) {
throw createHttpError(400, "Invalid candidate ID");
  }
const candidate = await candidateModel.findById(candidateId).exec();

if (!candidate) {
throw createHttpError(404, "Candidate not found");
}

if (!candidate.userId.equals(authenticatedUserId)) {
throw createHttpError(401, "You cannot access this candidate.");
}

res.status(200).json(candidate);
} catch (error) {
next(error);
}
};
 
interface CreateCandidateBody {
  email?: string;
  name?: string;
phone?: string;
address?: string;
skills?: string[];
experience?: number;
education?: string;
certifications?: string[];
desiredPay?: string;
typeOfEmployment?: string[];
desiredWorkLocation?: string[];
status?: string;
notes?: string;

}
//* Create candidate
//* Using unknown here instead of any because any is unsafe, and unknown is safer because it is restrictive.
export const createCandidate: RequestHandler<unknown, unknown, CreateCandidateBody, unknown> = async (req, res, next) => {
  const name = req.body.name;
  const email = req.body.email;
  const phone = req.body.phone;
  const address = req.body.address;
  const skills = req.body.skills;
  const experience = req.body.experience;
  const education = req.body.education;
  const certifications = req.body.certifications;
  const desiredPay = req.body.desiredPay;
  const typeOfEmployment = req.body.typeOfEmployment;
  const desiredWorkLocation = req.body.desiredWorkLocation;
  const status = req.body.status;
  const notes = req.body.notes;
  const authenticatedUserId = req.session.userId;
  try {
assertIsDefined(authenticatedUserId);
if (!name) {
  throw createHttpError(400, "Name is required");
} else if (!email) {
 throw createHttpError(400, "Email is required");
}

    const newCandidate = await candidateModel.create({
      userId: authenticatedUserId,
      name,
      email,
      phone,
      address,
      skills,
      experience,
      education,
      certifications,
      desiredPay,
      typeOfEmployment,
      desiredWorkLocation,
      status,
      notes,
    });

    res.status(201).json(newCandidate);
  } catch (error) {
    next(error);
  }
};

//* Update candidate

interface UpdateCandidateParams {
  candidateId: string;

}
interface UpdateCandidateBody {
  email?: string;
  name?: string;
phone?: string;
address?: string;
skills?: string[];
experience?: number;
education?: string;
certifications?: string[];
desiredPay?: string;
typeOfEmployment?: string[];
desiredWorkLocation?: string[];
status?: string;
notes?: string;

}


export const updateCandidate: RequestHandler<UpdateCandidateParams, unknown, UpdateCandidateBody, unknown> = async (req, res, next) => {

  const candidateId = req.params.candidateId;
  const newEmail = req.body.email;
  const newName = req.body.name;
  const newPhone = req.body.phone;
  const newAddress = req.body.address;
  const newSkills = req.body.skills ?? [];
  const newExperience = req.body.experience;
  const newEducation = req.body.education;
  const newCertifications = req.body.certifications ?? [];
  const newDesiredPay = req.body.desiredPay;
  const newTypeOfEmployment = req.body.typeOfEmployment ?? [];
const newDesiredWorkLocation = req.body.desiredWorkLocation ?? [];
const newStatus = req.body.status || "active";
const newNotes = req.body.notes;
const authenticatedUserId = req.session.userId;
  try {
    assertIsDefined(authenticatedUserId);
  if (!mongoose.isValidObjectId(candidateId)) {
    throw createHttpError(400, "Invalid candidate ID");
      }

      if (!newName) {
        throw createHttpError(400, "Name is required");
      } else if (!newEmail) {
       throw createHttpError(400, "Email is required");
      } 
      

      const candidate = await candidateModel.findById(candidateId).exec();

      if (!candidate) {
        throw createHttpError(404, "Candidate not found");
      }

      if (!candidate.userId.equals(authenticatedUserId)) {
        throw createHttpError(401, "You cannot access this candidate.");
      }
      
      candidate.name = newName;
      candidate.email = newEmail;
      candidate.phone = newPhone;
      candidate.address = newAddress;
      candidate.skills = newSkills;
      candidate.experience = newExperience;
      candidate.education = newEducation;
      candidate.certifications = newCertifications;
      candidate.desiredPay = newDesiredPay;
      candidate.typeOfEmployment = newTypeOfEmployment;
      candidate.desiredWorkLocation = newDesiredWorkLocation;
      candidate.status = newStatus;
      candidate.notes = newNotes;
 
      const updatedCandidate = await candidate.save();

      res.status(200).json(updatedCandidate);
} catch (error) {
  next(error);
}
};

//* Delete candidate

export const deleteCandidate: RequestHandler = async (req, res, next) => {
  const candidateId = req.params.candidateId;
  const authenticatedUserId = req.session.userId;

  try {
    assertIsDefined(authenticatedUserId);
    if (!mongoose.isValidObjectId(candidateId)) {
      throw createHttpError(400, "Invalid candidate ID");
    }

    const candidate = await candidateModel.findById(candidateId).exec();

    if (!candidate) {
      throw createHttpError(404, "Candidate not found");
    }

    if (!candidate.userId.equals(authenticatedUserId)) {
      throw createHttpError(401, "You cannot access this candidate.");
    }

    await candidateModel.deleteOne({ _id: candidateId });

res.sendStatus(204);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};