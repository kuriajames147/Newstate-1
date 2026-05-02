const Joi = require('joi');

const validateRegistration = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^(?:254|0)(7|1)\d{8}$/).required(),
    password: Joi.string().min(6).required(),
    referral_code: Joi.string().allow(null).allow('').optional()  // FIXED: allow null and empty string
  });

  const { error } = schema.validate(req.body);
  if (error) {
    console.log('Validation error:', error.details[0].message);
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

const validateWithdrawal = (req, res, next) => {
  const schema = Joi.object({
    amount: Joi.number().min(300).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

module.exports = { validateRegistration, validateLogin, validateWithdrawal };