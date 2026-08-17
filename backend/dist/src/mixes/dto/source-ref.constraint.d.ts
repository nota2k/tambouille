import { ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
export declare class SourceRefConstraint implements ValidatorConstraintInterface {
    validate(value: unknown, args: ValidationArguments): boolean;
    defaultMessage(): string;
}
