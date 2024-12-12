import AccessControl from '../accessControl.js';

export default class Controller {
    constructor(HttpContext, repository = null, requiredAuthorizations = null) {
        this.requiredAuthorizations = requiredAuthorizations ? requiredAuthorizations : AccessControl.anonymous();
        this.HttpContext = HttpContext;
        this.repository = repository;
    }
    head() {
        if (AccessControl.readGranted(this.HttpContext.authorizations, this.requiredAuthorizations)) {
            if (this.repository != null) {
                this.HttpContext.response.ETag(this.repository.ETag);
            } else
                this.HttpContext.response.notImplemented();
        } else
            this.HttpContext.response.unAuthorized("Unauthorized access");
    }
    get(id) {
        if (AccessControl.readGranted(this.HttpContext.authorizations, this.requiredAuthorizations)) {
            if (this.repository != null) {
                if (id !== '') {
                    let data = this.repository.get(id);
                    if (data != null)
                        this.HttpContext.response.JSON(data);
                    else
                        this.HttpContext.response.notFound("Ressource not found.");
                } else {
                    let data = this.repository.getAll(this.HttpContext.path.params);
                    if (this.repository.valid())
                        this.HttpContext.response.JSON(data, this.repository.ETag, false, this.requiredAuthorizations);
                    else
                        this.HttpContext.response.badRequest(this.repository.errorMessages);
                }
            } else
                this.HttpContext.response.notImplemented();
        } else
            this.HttpContext.response.unAuthorized("Unauthorized access");
    }
    post(data) {
        if (AccessControl.writeGranted(this.HttpContext.authorizations, this.requiredAuthorizations)) {
            data = this.repository.add(data);
            if (this.repository.model.state.isValid) {
                this.HttpContext.response.created(data);
            } else {
                if (this.repository.model.state.inConflict)
                    this.HttpContext.response.conflict(this.repository.model.state.errors);
                else
                    this.HttpContext.response.badRequest(this.repository.model.state.errors);
            }
        } else
            this.HttpContext.response.unAuthorized("Unauthorized access");
    }
    put(data) {
        if (AccessControl.writeGranted(this.HttpContext.authorizations, this.requiredAuthorizations)) {
            if (this.HttpContext.path.id !== '') {
                data = this.repository.update(this.HttpContext.path.id, data);
                if (this.repository.model.state.isValid) {
                    this.HttpContext.response.accepted(data);
                } else {
                    if (this.repository.model.state.notFound) {
                        this.HttpContext.response.notFound(this.repository.model.state.errors);
                    } else {
                        if (this.repository.model.state.inConflict)
                            this.HttpContext.response.conflict(this.repository.model.state.errors)
                        else
                            this.HttpContext.response.badRequest(this.repository.model.state.errors);
                    }
                }
            } else
                this.HttpContext.response.badRequest("The Id of ressource is not specified in the request url.");
        } else
            this.HttpContext.response.unAuthorized("Unauthorized access");
    }
    remove(id) {
        if (AccessControl.writeGranted(this.HttpContext.authorizations, this.requiredAuthorizations)) {
            if (this.HttpContext.path.id !== '') {
                if (this.repository.remove(id))
                    this.HttpContext.response.accepted();
                else
                    this.HttpContext.response.notFound("Ressource not found.");
            } else
                this.HttpContext.response.badRequest("The Id in the request url is  not specified.");
        } else
            this.HttpContext.response.unAuthorized("Unauthorized access");
    }
}
