const ValidationError = require('../error/validationError.js');

/*
 * @param {string|Object} valDef - string => registered schema id. Object => schema definition
 * @param {string}  dataProp - query|body|params
 * @return {Function}
 * @throws {ValidationError}
 */
module.exports = function(valDef, dataProp) {

    const validator = this.Router.App.getValidator();
    var validate;

    if (typeof dataProp !== 'string' || !dataProp) {
        throw new Error('Invalid target data property argument: `dataProp`. Expected a string.');
    }

    if (typeof valDef === 'object' && valDef !== null) {
        validate = validator.compile(valDef);
    } else {
        validate = validator.getSchema(valDef);
    }

    if (typeof validate !== 'function') {
        throw new Error(`No validator for ${valDef} exists`);
    }

    return function validationMiddleware(req, res) {

        if (validate(req[dataProp])) {
            return null;
        }

        const err = validate.errors.shift();

        if (err && !err.dataPath) {
            err.dataPath = '<' + dataProp + '>';
        }

        throw new ValidationError(err);
    };
};