
const API_URLL = "https://glory-fascinated-ticket.glitch.me/api/likes";
class Like_APi {
    static initHttpState() {
        this.currentHttpError = "";
        this.currentStatus = 0;
        this.error = false;
    }
    static API_getcurrentHttpError () {
        return this.currentHttpError; 
    }
    static setHttpErrorState(xhr) {
        if (xhr.responseJSON)
            this.currentHttpError = xhr.responseJSON.error_description;
        else
            this.currentHttpError = xhr.statusText == 'error' ? "Service introuvable" : xhr.statusText;
        this.currentStatus = xhr.status;
        this.error = true;
    }
    static async HEAD() {
        Like_APi.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: API_URLL,
                type: 'HEAD',
                contentType: 'text/plain',
                complete: data => { resolve(data.getResponseHeader('ETag')); },
                error: (xhr) => { Like_APi.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async getLikes(postId) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: API_URLL + `?postid=${postId}`,
                type: 'GET',
                contentType: 'application/json',
                success: function (data) {
                    resolve(data); // Resolves the promise with the data from the server
                },
                error: function (xhr, status, error) {
                    console.error('Error fetching likes:', error);
                    reject(error); // Rejects the promise with the error
                }
            });
        });
    }
    static async addLike(postId,userId, token) {
        return new Promise((resolve) => {
            $.ajax({
                url: API_URLL + `?postid=${postId}&userid=${userId}`,
                type: 'POST',
                headers: {
                    'authorization': 'Bearer ' + token
                },
                complete: data => {
                    resolve({likes:data, ETag: data.getResponseHeader('ETag')});
                },
                error: (xhr) => {
                    Like_APi.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }
    static async removeLike(postId, userId, token) {
        return new Promise((resolve) => {
            $.ajax({
                url: API_URLL + `?postid=${postId}&userid=${userId}`,
                type: 'PUT',
                headers: {
                    'authorization': 'Bearer ' + token
                },
                complete: data => {
                    resolve({likes:data, ETag: data.getResponseHeader('ETag')});
                },
                error: (xhr) => {
                    Like_APi.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }

    static async removebyuser(userId) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: 'https://glory-fascinated-ticket.glitch.me/likes/removebyuser/' + userId,
                type: 'DELETE',
                contentType: 'application/json',
                success: function (data) {
                    console.log(data);
                    resolve(data); // Resolves the promise with the data from the server
                },
                error: function (data) {
                    reject(error); // Rejects the promise with the error
                }
            });
        });
    }
}