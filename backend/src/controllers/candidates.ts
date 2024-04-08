import { RequestHandler } from "express";
import candidateModel from "../models/candidate";

export const getCandidates: RequestHandler = async (req, res, next) => {
  //! try/catch w/ next(error) necessary until express 5.0 release. Express 5.0 will have built-in error handling
  try {
    const candidates = await candidateModel.find().exec();
    res.status(200).json(candidates);
  } catch (error) {
    next(error);
  }
};

export const createCandidate: RequestHandler = async (req, res, next) => {
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

  try {
    const newCandidate = await candidateModel.create({
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
    });

    res.status(201).json(newCandidate);
  } catch (error) {
    next(error);
  }
};
