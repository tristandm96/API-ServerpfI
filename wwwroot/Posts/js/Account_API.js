
const API_URL  ="http://localhost:5000/accounts"
class Account_API {
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
    static async AdminGetUser(id,token) {
        Account_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: API_URL + "/index/"+id,
                headers: {
                    'authorization': 'Bearer ' + token
                },
                complete: data => {
                    resolve({ ETag: data.getResponseHeader('ETag'), data: data.responseJSON });
                },
                error: (xhr) => {
                    Posts_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }
    static async AdminPromoteUser(data) {
        Account_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: API_URL + "/promote",
                type:'POST',
                contentType: 'application/json',
                data: JSON.stringify(data),
                complete: data => {
                    resolve( data.responseJSON );
                },
                error: (xhr) => {
                    Posts_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }
    static async AdminBlockUser(data) {
        Account_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: API_URL + "/block",
                type:'POST',
                contentType: 'application/json',
                data: JSON.stringify(data),
                complete: data => {
                    resolve( data.responseJSON );
                },
                error: (xhr) => {
                    Posts_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    } 
    static async updatetoken(user) {
        Account_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: "http://localhost:5000/token" + user,
                type: "PUT",
                contentType: 'application/json',
                success: () => { resolve(true); },
                error: (xhr) => { Account_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async verify(userId,Code) {
        Account_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: API_URL+ "/verify?id=" + userId + "&code=" + Code,
                type: "GET",
                contentType: 'application/json',
                success: () => { resolve(true); },
                error: (xhr) => { Account_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Register(data) {
        Account_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: API_URL+ "/register" ,
                type: "POST",
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: (data) => { resolve(data); },
                error: (xhr) => { Account_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Login(data) {
        Account_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: "http://localhost:5000/token",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(data),
                success: (data) => { resolve(data); },
                error: (xhr) => { Account_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Logout(id){
        return new Promise(resolve => {
            $.ajax({
                url: "http://localhost:5000/token?Id=" + id,
                type: "DELETE",
                contentType: "application/json",
                error: (xhr) => { Account_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async modify(data, token) {
        Account_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: API_URL + "/modify",
                type: "PUT",
                contentType: "application/json",
                data: JSON.stringify(data),
                headers: {
                    'authorization': 'Bearer ' + token
                },
                success: (data) => {
                    resolve({ success: true, data : data }); 
                },
                error: (xhr) => { Account_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Delete(id,token) {
        return new Promise(resolve => {
            $.ajax({
                url: API_URL + "/remove/" + id,
                type: "DELETE",
                headers: {
                    'authorization': 'Bearer ' + token
                },
                success: () => {
                    resolve(true); 
                },
                error: (xhr) => { Account_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async fetchCurrentUser(token) {
         return new Promise((resolve) => {
            $.ajax({
                url: "http://localhost:5000/token/user",
                type: "GET",
                contentType: "application/json",
                headers: {
                    'authorization': 'Bearer ' + token// Corrected the header syntax and added a space after "Bearer"
                },
                success: (data) => resolve(data),
                error: () => resolve(false),
            });
        });
    }
    
  static async addpost(data,token,postid) {
    Account_API.initHttpState();
    return new Promise(resolve => {
        $.ajax({
            url: API_URL + "/addpost?postid=" + postid,
            type: "PUT",
            contentType: "application/json",
            data: JSON.stringify(data),
            headers: {
                'authorization': 'Bearer ' + token
            },
            success: (data) => {
                resolve({ success: true, data: data }); 
            },
            error: (xhr) => { Account_API.setHttpErrorState(xhr); resolve(null); }
        });
    });
}
}
