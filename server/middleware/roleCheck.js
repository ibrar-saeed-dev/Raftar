exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

exports.isDriver = (req, res, next) => {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ error: 'Driver access required' });
  }
  next();
};

exports.isPassenger = (req, res, next) => {
  if (req.user.role !== 'passenger') {
    return res.status(403).json({ error: 'Passenger access required' });
  }
  next();
};

exports.isFleetOwner = (req, res, next) => {
  if (req.user.role !== 'fleet_owner') {
    return res.status(403).json({ error: 'Fleet owner access required' });
  }
  next();
};

exports.isVerified = (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({ error: 'Verification required' });
  }
  next();
};