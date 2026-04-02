/**
 * Middleware to restrict access based on user roles
 * @param {...string} roles - Authorized roles
 */
const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: 'User role not identified' });
    }

    const { role } = req.user;

    // Admin/Pathology overlap: pathology is often treated as admin in this context
    const authorizedRoles = [...roles];
    if (roles.includes('pathology') && !authorizedRoles.includes('admin')) {
      authorizedRoles.push('admin');
    }

    if (!authorizedRoles.includes(role)) {
      console.warn(`[FORBIDDEN] Role ${role} attempted to access restricted route.`);
      return res.status(403).json({ 
        message: `Your role (${role}) does not have permission to perform this action.` 
      });
    }

    next();
  };
};

module.exports = roleMiddleware;
