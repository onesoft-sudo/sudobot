import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";

export default function ValidatorError(request: Request, res: Response, next: NextFunction) {
    const errors = validationResult(request);

    if (!errors.isEmpty()) {
        return res.status(422).send({ errors: errors.array(), error_type: 'validation' });
    }

    next();
}