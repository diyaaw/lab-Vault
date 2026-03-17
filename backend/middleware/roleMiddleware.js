const roleMiddleware = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized, no user data' });
        }

        // Add role aliasing: 'admin' can access 'pathology' routes
        const userRole = req.user.role;
        const extendedRoles = [...roles];
        if (roles.includes('pathology') && !extendedRoles.includes('admin')) {
            extendedRoles.push('admin');
        }

        if (!extendedRoles.includes(userRole)) {
            return res.status(403).json({ message: `Role ${userRole} is not authorized to access this route. Required: ${roles.join(', ')}` });
        }
        next();
    };
};

module.exports = roleMiddleware;
