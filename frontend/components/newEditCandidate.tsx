import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { CandidateInput } from "@/network/candidate-api";
import * as candidateApi from "@/network/candidate-api";
import { Candidate } from "@/models/candidate";
import TextInputField from "@/components/form/TextInputField";

interface NewEditCandidateProps {
  candidateToEdit?: Candidate;
  onDismiss: () => void;
  onCandidateAdded: (candidate: Candidate) => void;
}

const NewEditCandidate = ({
  candidateToEdit,
  onDismiss,
  onCandidateAdded,
}: NewEditCandidateProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CandidateInput>({
    defaultValues: {
      name: candidateToEdit?.name || "",
      email: candidateToEdit?.email || "",
      status: candidateToEdit?.status || "",
      phone: candidateToEdit?.phone || "",
      address: candidateToEdit?.address || "",
      skills: candidateToEdit?.skills || [],
      experience: candidateToEdit?.experience || 0,
      education: candidateToEdit?.education || "",
      certifications: candidateToEdit?.certifications || [],
      desiredPay: candidateToEdit?.desiredPay || "",
      typeOfEmployment: candidateToEdit?.typeOfEmployment || [],
      desiredWorkLocation: candidateToEdit?.desiredWorkLocation || [],
      notes: candidateToEdit?.notes || "",
    },
  });

  async function onSubmit(input: CandidateInput) {
    try {
      let candidateResponse: Candidate;
      if (candidateToEdit) {
        candidateResponse = await candidateApi.updateCandidate(
          candidateToEdit._id,
          input
        );
      } else {
        candidateResponse = await candidateApi.createCandidate(input);
      }
      onCandidateAdded(candidateResponse);
    } catch (error) {
      console.log(error);
      alert(error);
    }
  }

  return (
    <>
      <Modal
        size="xl"
        show
        onHide={onDismiss}>
        <Modal.Header closeButton>
          <Modal.Title>
            {candidateToEdit ? "Edit Candidate" : "Add Candidate"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form
            id="addEditCandidateForm"
            onSubmit={handleSubmit(onSubmit)}>
            <Row>
              <Col>
                <Form.Group>
                  <TextInputField
                    name="name"
                    label="Name"
                    type="text"
                    placeholder="Johnny Appleseed"
                    register={register}
                    registerOptions={{ required: "Name is required" }}
                    error={errors.name}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <TextInputField
                    name="email"
                    label="Email"
                    type="email"
                    placeholder="email@domain.com"
                    register={register}
                    registerOptions={{ required: "email is required" }}
                    error={errors.email}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
  <Col>
    <TextInputField
      name="phone"
      label="Phone"
      type="text"
      placeholder="123-456-7890"
      register={register}
    />
  </Col>
  <Col>
    <TextInputField
      name="status"
      label="Status"
      type="text"
      placeholder="Active, Inactive, Interviewing, Hired, Rejected, etc."
      register={register}
      error={errors.status}
    />
  </Col>
</Row>
<TextInputField
  name="address"
  label="Address"
  type="text"
  placeholder="123 Developer Ln"
  register={register}
 
/>
<Row>
<Col>
<TextInputField
  name="education"
  label="Education"
  type="select"
  options={[
    { value: "", label: "" },
    { value: "GED", label: "GED" },
    { value: "HS Diploma", label: "HS Diploma" },
    { value: "Bachelors", label: "Bachelors" },
    { value: "Masters", label: "Masters" },
    { value: "Ph.D", label: "Ph.D" },
    { value: "Bootcamp", label: "Bootcamp" },
  ]}
  register={register}

/>
</Col>
<Col>
<TextInputField
  name="experience"
  label="Experience"
  type="number"
  placeholder="Enter years of experience"
  register={register}
 
/>
</Col>
<Col>
<TextInputField
  name="desiredPay"
  label="Desired Pay"
  type="text"
  placeholder="120k, 120000, 120k-150k, 120000-150000"
  register={register}

/>
</Col>
</Row>
<TextInputField
  name="skills"
  label="Skills"
  type="text"
  placeholder="HTML, CSS, JavaScript, etc."
  register={register}
 
/>

<TextInputField
  name="certifications"
  label="Certifications"
  type="text"
  placeholder="CISSP, AWS, etc."
  register={register}

/>
<Row>
<Col>
<TextInputField
  name="typeOfEmployment"
  label="Type of Employment"
  type="text"
  placeholder="Full-Time, Part-Time, Contract, etc."
  register={register}
/>
</Col>
<Col>
<TextInputField
  name="desiredWorkLocation"
  label="Desired Work Location"
  type="text"
  placeholder="In-Office, Remote, Hybrid, etc."
  register={register}
 
/>
</Col>
</Row>

<TextInputField
  name="notes"
  label="Notes"
  as="textarea"
  placeholder="notes, links, etc."
  register={register}
 rows={5}
/>

          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="primary"
            type="submit"
            form="addEditCandidateForm"
            disabled={isSubmitting}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default NewEditCandidate;
