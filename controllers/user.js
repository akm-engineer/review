const jwt = require("jsonwebtoken");
const User = require("../models/user");
const EmailVerificationToken = require("../models/emailVerificationTokens");
const { isValidObjectId } = require("mongoose");
const { generateOTP, generateMailTransporter } = require("../utils/mail");
const { sendError, generateRandomBytes } = require("../utils/helper");
const PasswordResetToken = require("../models/passwordResetToken");

exports.create = async (req, res) => {
  const { name, email, password } = req.body;

  const oldUser = await User.findOne({ email });

  if (oldUser) return sendError(res, "This email already exists");

  const newUser = new User({ name, email, password });
  await newUser.save();

  //Generate 6-Digit OTP
  let OTP = generateOTP();
  //storing on db
  const newVerificationToken = new EmailVerificationToken({
    owner: newUser._id,
    token: OTP,
  });

  await newVerificationToken.save();

  //send otp to user
  var transport = generateMailTransporter();
  transport.sendMail({
    from: "verification@reviewapp.com",
    to: newUser.email,
    subject: "Email Verification",
    html: `
    <p>Your Verification OTP</p>
    <p>${OTP}</p>
    `,
  });
  //after validating in frontend we will send userInfo along with creating user
  res.status(201).json({
    user: {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
    },
  });
};

exports.verifyEmail = async (req, res) => {
  const { userId, OTP } = req.body;

  if (!isValidObjectId(userId)) return sendError(res, "Invalid User");

  const user = await User.findById(userId);
  if (!user) return sendError(res, "User not found!!", 404);

  if (user.isVerified) return sendError(res, "Account already verified!! ");

  const token = await EmailVerificationToken.findOne({ owner: userId });
  if (!token) return sendError(res, "token not found");

  const isMatched = await token.compareToken(OTP);
  if (!isMatched) return sendError(res, "Please enter the valid OTP");

  user.isVerified = true;
  await user.save();

  await EmailVerificationToken.findByIdAndDelete(token._id);

  var transport = generateMailTransporter();

  transport.sendMail({
    from: "verification@reviewapp.com",
    to: user.email,
    subject: "Welcome Email ",
    html: `
    <h1>welcome to our app and thanks for choosing Us...</h1>
    
    `,
  });

  const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      token: jwtToken,
      isVerified: user.isVerified,
      role: user.role,
    },
    message: "Your email is verified",
  });
};

exports.resendEmailVerification = async (req, res) => {
  const { userId } = req.body;

  const user = await User.findById(userId);
  if (!user) return sendError(res, "User not found!!");

  if (user.isVerified) return sendError(res, "Already Verified...");

  const alreadyHasToken = await EmailVerificationToken.findOne({
    owner: userId,
  });

  if (alreadyHasToken)
    return sendError(res, "Wait for a hour to get another OTP");

  //Generate 6-Digit OTP
  let OTP = generateOTP();
  //storing on db
  const newVerificationToken = new EmailVerificationToken({
    owner: user._id,
    token: OTP,
  });
  await newVerificationToken.save();

  //send otp to user
  var transport = generateMailTransporter();
  transport.sendMail({
    from: "verification@reviewapp.com",
    to: user.email,
    subject: "Email Verification",
    html: `
    <p>Your Verification OTP</p>
    <p>${OTP}</p>
    `,
  });
  res.json({
    message: "New OTP has been sent to your registered email accout.",
  });
};

//Reset -Password

exports.forgetPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) return sendError(res, "Email is missing");

  const user = await User.findOne({ email });
  if (!user) return sendError(res, "User not found", 404);

  const alreadyHasToken = await PasswordResetToken.findOne({ owner: user._id });
  if (alreadyHasToken)
    return sendError(res, "Only after a hour you can request for new token");

  const token = await generateRandomBytes();
  const newPasswordResetToken = await PasswordResetToken({
    owner: user._id,
    token,
  });
  await newPasswordResetToken.save();

  const resetPasswordUrl = `http://localhost:3000/auth/reset-password?token=${token}&id=${user._id}`;

  const transport = generateMailTransporter();

  transport.sendMail({
    from: "security@reviewapp.com",
    to: user.email,
    subject: "Reset Password",
    html: `
    <p>Click here to reset password</p>
    <a href=${resetPasswordUrl}>Reset Password</a>
    `,
  });
  res.json({ message: "Link send to your email" });
};
//Changing User Password
exports.sendResetPasswordTokenStatus = (req, res) => {
  res.json({ valid: true });
};

exports.resetPassword = async (req, res) => {
  const { newPassword, userId } = req.body;

  const user = await User.findById(userId);
  const matched = await user.comparePassword(newPassword);
  if (matched)
    return sendError(res, "New password must be different from old one");

  user.password = newPassword;
  await user.save();

  await PasswordResetToken.findByIdAndDelete(req.resetToken._id);

  const transport = generateMailTransporter();

  transport.sendMail({
    from: "security@reviewapp.com",
    to: user.email,
    subject: "Reset Password successfully",
    html: `
    <h1>Reset Password successfully</h1>
    <p >Now you can use new password</p>
    `,
  });
  res.json({
    message: "Password reset successfully, now you can use your new password",
  });
};

exports.signIn = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return sendError(res, "Email/password mismatch");

  const matched = await user.comparePassword(password);
  if (!matched) return sendError(res, "Email/password mismatch");

  const { _id, name, role, isVerified } = user;

  const jwtToken = jwt.sign({ userId: _id }, process.env.JWT_SECRET);

  res.json({
    user: { id: _id, name, role, email, token: jwtToken, isVerified },
  });
};
