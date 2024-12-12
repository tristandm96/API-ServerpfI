import AccessControl from '../accessControl.js';
import likesModel from '../models/Likes.js';
import Repository from '../models/repository.js';
import Controller from './Controller.js';
export default class LikesController extends Controller {
    constructor(HttpContext) {

        super(HttpContext,new Repository (new likesModel()));
    }
    get() {
        let postId= this.HttpContext.path.params.postid;
        if (this.repository != null) {
            if (postId !== '') {
                let likeData = this.repository.findByField('PostId', postId);
                if (likeData) {
                    this.HttpContext.response.JSON(likeData);
                } else {
                    let likeRecord = {
                        Id : "0",
                        PostId: postId,
                        Total: 0,
                        UsersId: []
                    };
                    this.repository.add(likeRecord);
                    // Fetch the newly added record
                    likeData = this.repository.findByField('PostId', postId);
                    this.HttpContext.response.JSON(likeData);
                }
            } else {
                this.HttpContext.response.badRequest("Post ID is not specified.");
            }
        } else {
            this.HttpContext.response.notImplemented();
        }
    }

    post() {
        if (AccessControl.writeGranted(this.HttpContext.authorizations, AccessControl.user())) {
            let PostId = this.HttpContext.path.params.postid;
            let UserId = this.HttpContext.path.params.userid;

            if (!PostId || !UserId) {
                this.HttpContext.response.badRequest("PostId and UserId are required.");
                return;
            }

            // Check if the like record exists
            let likeRecord = this.repository.findByField('PostId', PostId);
            if (likeRecord) {
                if (likeRecord.UsersId.includes(UserId)) {
                    this.HttpContext.response.conflict("User already liked this post.");
                }

                likeRecord.UsersId.push(UserId);
                likeRecord.Total++;
                this.repository.update(likeRecord.Id, likeRecord);
                this.HttpContext.response.JSON(likeRecord,this.repository.ETag);
            } else {
                // Create a new like record
                likeRecord = {
                    PostId,
                    Total: 1,
                    UsersId: [UserId],
                };
                this.repository.add(likeRecord);
                this.HttpContext.response.JSON(likeRecord,this.repository.ETag);
            }
          } 
    }

    put() {
        if (AccessControl.writeGranted(this.HttpContext.authorizations, AccessControl.user())) {
        let PostId = this.HttpContext.path.params.postid;
        let UserId = this.HttpContext.path.params.userid;
        if (!PostId || !UserId) {
            this.HttpContext.response.badRequest("PostId and UserId are required.");
            return;
        }
    
        // Find the like record for the post
        let likeRecord = this.repository.findByField('PostId', PostId);
        if (likeRecord) {
            // Remove the user from the UsersId array
            const userIndex = likeRecord.UsersId.indexOf(UserId);
            if (userIndex === -1) {
                this.HttpContext.response.notFound({ message: "User has not liked this post." });
                return;
            }
            likeRecord.UsersId.splice(userIndex, 1);
            likeRecord.Total--;
    
            // If no users left, delete the record; otherwise, update it
            if (likeRecord.Total === 0) {
                this.repository.remove(likeRecord.Id);
                this.HttpContext.response.JSON(likeRecord,this.repository.Etag);
            } else {
                this.repository.update(likeRecord.Id, likeRecord);
                this.HttpContext.response.JSON(likeRecord,this.repository.Etag);
            }
        } else {
            this.HttpContext.response.notFound({ message: "Post not found." });
        }
    }
    }
removebyuser(userid) {

    if (!userid) {
        this.HttpContext.response.badRequest("UserId is required.");
        return;
    }
    const allLikes = this.repository.getAll();
    allLikes.forEach(likeRecord => {
        
        if (likeRecord.UsersId.includes(userid)) {
            const userIndex = likeRecord.UsersId.indexOf(userid);
            if (userIndex !== -1) {
                likeRecord.UsersId.splice(userIndex, 1);
                console.log(`User ${userid} has been removed.`);
                likeRecord.Total--;
            }
        }
       this.repository.update(likeRecord.Id, likeRecord);
    });
    this.HttpContext.response.JSON({
        message: `Likes removed for user ${userid}.`,
        status: "success",
    });
}}