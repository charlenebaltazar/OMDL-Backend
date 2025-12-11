import { Resend } from "resend";
import { IUser } from "../@types/interfaces";
import passwordReset from "./verifyEmailTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendPasswordResetCode = async function (receiver: IUser, code: string) {
  try {
    await resend.emails.send({
      from: "Olympus Medical and Diagnostic Laboratory <noreply@resend.dev>",
      to: receiver.email,
      subject: "Password Reset Code",
      html: passwordReset(`${receiver.firstname} ${receiver.surname}`, code),
    });

    console.log("Email sent successfully");
  } catch (error) {
    console.error("Failed to send email", error);
  }
};

export default sendPasswordResetCode;
