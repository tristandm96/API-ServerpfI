import AccessControl from '../accessControl.js';
import Gmail from "../gmail.js";
import Repository from '../models/repository.js';
import UserModel from '../models/user.js';
import TokenManager from '../tokensManager.js';
import * as utilities from "../utilities.js";
import Controller from './Controller.js';

export default class AccountsController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new UserModel()), AccessControl.admin());
    }
    index(id) {
        if (id != '') {
            if (AccessControl.readGranted(this.HttpContext.authorizations, AccessControl.admin()))
                this.HttpContext.response.JSON(this.repository.get(id));
            else
                this.HttpContext.response.unAuthorized("Unauthorized access");
        }
        else {
            if (AccessControl.granted(this.HttpContext.authorizations, AccessControl.admin()))
                this.HttpContext.response.JSON(this.repository.getAll(this.HttpContext.path.params), this.repository.ETag, false, AccessControl.admin());
            else
                this.HttpContext.response.unAuthorized("Unauthorized access");
        }
    }
    // POST: /token body payload[{"Email": "...", "Password": "..."}]
    login(loginInfo) {
        if (loginInfo) {
            if (this.repository != null) {
                let user = this.repository.findByField("Email", loginInfo.Email);
                if (user != null) {
                    if (user.Password == loginInfo.Password) {
                        user = this.repository.get(user.Id);
                        let newToken = TokenManager.create(user);
                        this.HttpContext.response.created(newToken);
                    } else {
                        this.HttpContext.response.wrongPassword("Wrong password.");
                    }
                } else
                    this.HttpContext.response.userNotFound("This user email is not found.");
            } else
                this.HttpContext.response.notImplemented();
        } else
            this.HttpContext.response.badRequest("Credential Email and password are missing.");
    }
    logout() {
        let userId = this.HttpContext.path.params.Id;
        if (userId) {
            TokenManager.logout(userId);
            this.HttpContext.response.ok();
        } else {
            this.HttpContext.response.badRequest("UserId is not specified.")
        }
    }
    sendVerificationEmail(user) {
        // bypass model bindeExtraData wich hide the user verifyCode
        let html = `
                Bonjour ${user.Name}, <br /> <br />
                Voici votre code pour confirmer votre adresse de courriel
                <br />
                <h3>${user.VerifyCode}</h3>
            `;
        const gmail = new Gmail();
        gmail.send(user.Email, 'Vérification de courriel...', html);
    }

    sendConfirmedEmail(user) {
        let html = `
                Bonjour ${user.Name}, <br /> <br />
                Votre courriel a été confirmé.
            `;
        const gmail = new Gmail();
        gmail.send(user.Email, 'Courriel confirmé...', html);
    }

    //GET : /accounts/verify?id=...&code=.....
    verify() {
        if (this.repository != null) {
            let id = this.HttpContext.path.params.id;
            let code = parseInt(this.HttpContext.path.params.code);
            let userFound = this.repository.findByField('Id', id);
            if (userFound) {
                if (userFound.VerifyCode == code) {
                    userFound.VerifyCode = "verified";
                    this.repository.update(userFound.Id, userFound);
                    if (this.repository.model.state.isValid) {
                        userFound = this.repository.get(userFound.Id); // get data binded record
                        this.HttpContext.response.JSON(userFound);
                        this.sendConfirmedEmail(userFound);
                    } else {
                        this.HttpContext.response.unprocessable();
                    }
                } else {
                    this.HttpContext.response.unverifiedUser("Verification code does not matched.");
                }
            } else {
                this.HttpContext.response.unprocessable();
            }
        } else
            this.HttpContext.response.notImplemented();
    }
    //GET : /accounts/conflict?Id=...&Email=.....
    conflict() {
        if (this.repository != null) {
            let id = this.HttpContext.path.params.Id;
            let email = this.HttpContext.path.params.Email;
            if (id && email) {
                let prototype = { Id: id, Email: email };
                this.HttpContext.response.JSON(this.repository.checkConflict(prototype));
            } else
                this.HttpContext.response.JSON(false);
        } else
            this.HttpContext.response.JSON(false);
    }

    // POST: account/register body payload[{"Id": 0, "Name": "...", "Email": "...", "Password": "..."}]
    register(user) {
        if (this.repository != null) {
            user.Created = utilities.nowInSeconds();
            let verifyCode = utilities.makeVerifyCode(6);
            user.VerifyCode = verifyCode;
            user.Authorizations = AccessControl.user();
            user.UserPosts = [];
            let newUser = this.repository.add(user);
            if (this.repository.model.state.isValid) {
                this.HttpContext.response.created(newUser);
                newUser.Verifycode = verifyCode;
                this.sendVerificationEmail(newUser);
            } else {
                if (this.repository.model.state.inConflict)
                    this.HttpContext.response.conflict(this.repository.model.state.errors);
                else
                    this.HttpContext.response.badRequest(this.repository.model.state.errors);
            }
        } else
            this.HttpContext.response.notImplemented();
    }
    promote(user) {
        if (this.repository != null) {
            let foundUser = this.repository.findByField("Id", user.Id);
            foundUser.Authorizations.readAccess++;
            if (foundUser.Authorizations.readAccess > 3) foundUser.Authorizations.readAccess = 1;
            foundUser.Authorizations.writeAccess++;
            if (foundUser.Authorizations.writeAccess > 3) foundUser.Authorizations.writeAccess = 1;
            let updatedUser = this.repository.update(user.Id, foundUser);
            if (this.repository.model.state.isValid) {
                TokenManager.updateUser(updatedUser)
                this.HttpContext.response.JSON(updatedUser);
            }
            else
                this.HttpContext.response.badRequest(this.repository.model.state.errors);
        } else
            this.HttpContext.response.notImplemented();
    }
    block(user) {
        if (this.repository != null) {
            let foundUser = this.repository.findByField("Id", user.Id);
            foundUser.Authorizations.readAccess = foundUser.Authorizations.readAccess == 1 ? -1 : 1;
            foundUser.Authorizations.writeAccess = foundUser.Authorizations.writeAccess == 1 ? -1 : 1;
            let updatedUser = this.repository.update(user.Id, foundUser);
            if (this.repository.model.state.isValid) {
                TokenManager.updateUser(updatedUser)
                this.HttpContext.response.JSON(updatedUser);
            }
            else
                this.HttpContext.response.badRequest(this.repository.model.state.errors);
        } else
            this.HttpContext.response.notImplemented();
    }
    // PUT:account/modify body payload[{"Id": 0, "Name": "...", "Email": "...", "Password": "..."}]
    modify(user) {
        // empty asset members imply no change and there values will be taken from the stored record
        if (AccessControl.writeGranted(this.HttpContext.authorizations, AccessControl.user())) {
            if (this.repository != null) {
                user.Created = utilities.nowInSeconds();
                let foundedUser = this.repository.findByField("Id", user.Id);
                if (foundedUser != null) {
                    user.Authorizations = foundedUser.Authorizations; // user cannot change its own authorizations
                    if (user.Password == '') { // password not changed
                        user.Password = foundedUser.Password;
                    }
                    user.Authorizations = foundedUser.Authorizations;
                    if (user.Email != foundedUser.Email) {
                        user.VerifyCode = utilities.makeVerifyCode(6);
                        this.sendVerificationEmail(user);
                    } else {
                        user.VerifyCode = foundedUser.VerifyCode;
                    }
                    this.repository.update(user.Id, user);
                    let updatedUser = this.repository.get(user.Id); // must get record user.id with binded data
                    let newtoken = TokenManager.updateUserToken(updatedUser);
                    if (this.repository.model.state.isValid) {
                        this.HttpContext.response.JSON(newtoken, this.repository.ETag);
                    }
                    else {
                        if (this.repository.model.state.inConflict)
                            this.HttpContext.response.conflict(this.repository.model.state.errors);
                        else
                            this.HttpContext.response.badRequest(this.repository.model.state.errors);
                    }
                } else
                    this.HttpContext.response.notFound();
            } else
                this.HttpContext.response.notImplemented();
        } else
            this.HttpContext.response.unAuthorized();
    }
    addpost(user) {
        // Check if the user has write permissions
        if (!AccessControl.writeGranted(this.HttpContext.authorizations, AccessControl.superUser())) {
            this.HttpContext.response.unAuthorized();
            return;
        }
        if (this.repository == null) {
            this.HttpContext.response.notImplemented();
            return;
        }
        // Validate inputs
        const postId = this.HttpContext.path.params.postid;
        if (!postId) {
            this.HttpContext.response.badRequest("Post ID is required.");
            return;
        }
        // Find the user by ID
        const foundUser = this.repository.findByField("Id", user.Id);
        if (!foundUser) {
            this.HttpContext.response.notFound({ message: "User not found." });
            return;
        }
        // Check if the post is already in the user's posts
        if (foundUser.UserPosts.includes(postId)) {
            this.HttpContext.response.conflict({ message: "Post is already associated with the user." });
            return;
        }
        try {
            foundUser.UserPosts.push(postId);
            this.repository.update(user.Id, foundUser);

            // Fetch the updated user record
            const updatedUser = this.repository.get(user.Id);
            const newToken = TokenManager.updateUserToken(updatedUser);

            if (this.repository.model.state.isValid) {
                this.HttpContext.response.JSON(newToken, this.repository.ETag);
            } else {
                if (this.repository.model.state.inConflict) {
                    this.HttpContext.response.conflict(this.repository.model.state.errors);
                } else {
                    this.HttpContext.response.badRequest(this.repository.model.state.errors);
                }
            }
        } catch (error) {
            console.error("Error adding post:", error);
            this.HttpContext.response.serverError({ message: "An error occurred while adding the post.", error: error.message });
        }
    }
    // GET:account/remove/id
    remove(id) { // warning! this is not an API endpoint 
        // todo make sure that the requester has legitimity to delete ethier itself or its an admin
        if (AccessControl.writeGrantedAdminOrOwner(this.HttpContext, this.requiredAuthorizations, id)) {
            if (this.repository != null) {
                this.repository.remove(id);
                TokenManager.logout(id);
            } else {
                this.HttpContext.response.badRequest(this.repository.model.state.errors);
            }
        } else
            this.HttpContext.response.notImplemented();
    }
}
