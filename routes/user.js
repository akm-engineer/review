const express = require("express");

const {
  create,
  verifyEmail,
  resendEmailVerification,
  forgetPassword,
  sendResetPasswordTokenStatus,
  resetPassword,
  signIn,
} = require("../controllers/user");
const {
  userValiator,
  validate,
  validatePassword,
  signInValidator,
} = require("../middlewares/validator");
const { isValidPassResetTken } = require("../middlewares/user");
const { isAuth } = require("../middlewares/auth.js");
const router = express.Router();

router.post("/create", userValiator, validate, create);
router.post("/sign-in", signInValidator, validate, signIn);

router.post("/verify-email", verifyEmail);
router.post("/resend-verify-token", resendEmailVerification);
router.post("/forget-password", forgetPassword);
router.post(
  "/verify-password-reset-token",
  isValidPassResetTken,
  sendResetPasswordTokenStatus
);
router.post(
  "/reset-password",
  validatePassword,
  validate,
  isValidPassResetTken,
  resetPassword
);
router.get("/is-auth", isAuth, (req, res) => {
  const { user } = req;
  res.json({
    user: {
      id: user._id,

      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
      role: user.role,
    },
  });
});
module.exports = router;
