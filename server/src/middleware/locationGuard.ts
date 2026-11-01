import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

/**
 * Validates that the logged-in user is authorized to perform operations
 * for the requested location.
 * - Admin: Global permission across all locations.
 * - Staff: Restricted to locations listed in user.assignedLocations.
 *
 * @param locationIdExtractor Optional callback to extract locationId from req.
 * If omitted, automatically checks req.params.locationId, req.params.id,
 * req.body.locationId, or req.query.locationId.
 */
export function validateLocationAccess(
  locationIdExtractor?: (req: Request) => string | undefined
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    // Admins have unrestricted access to all locations
    if (req.user.role === 'admin') {
      return next();
    }

    // Extract target location ID
    let targetLocationId: string | undefined;
    if (locationIdExtractor) {
      targetLocationId = locationIdExtractor(req);
    } else {
      targetLocationId =
        (req.params.locationId as string) ||
        (req.params.id as string) ||
        (req.body.locationId as string) ||
        (req.query.locationId as string);
    }

    if (!targetLocationId) {
      // If no location ID is targeted, allow next handler to handle
      return next();
    }

    const isAssigned = req.user.assignedLocations.includes(targetLocationId.toString());

    if (!isAssigned) {
      return next(
        new AppError(
          'Forbidden: You are not authorized to access or perform actions at this location.',
          403
        )
      );
    }

    next();
  };
}
