const userActivityEvents = ['mousemove', 'keypress', 'click', 'scroll'];

const jsonuser =
{
    "Name": "Visiteur",
    "Authorizations": {
        "readAccess": 0,
        "writeAccess": 0
    }
}

const periodicRefreshPeriod = 10;
const waitingGifTrigger = 2000;
const minKeywordLenth = 3;
const keywordsOnchangeDelay = 500;

let categories = [];
let selectedCategory = "";
let PostETag = "";
let likeEtag = "";
let periodic_Refresh_paused = false;
let postsPanel;
let itemLayout;
let waiting = null;
let showKeywords = false;
let keywordsOnchangeTimger = null;
let user;
async function inituser() {
    let User = await Account_API.fetchCurrentUser(getCookie("Token"));
    if (User) {
        return JSON.parse(User);
    }
    else
        return jsonuser;
}
async function Init_UI() {
    user = await inituser();
    postsPanel = await new PageManager('postsScrollPanel', 'postsPanel', 'postSample', renderPosts);
    $('#createPost').on("click", async function () {
        showCreatePostForm();
    });
    $('#abort').on("click", async function () {
        showPosts();
    });
    $('#aboutCmd').on("click", function () {
        showAbout();
    });
    $("#showSearch").on('click', function () {
        toogleShowKeywords();
        showPosts();
    });
    installKeywordsOnkeyupEvent();
    showPosts();
    start_Periodic_Refresh();
    Userupdate();
    updateDropDownMenu();
    //initTimeout(10,Sessionexpired); 
}

Init_UI();

/////////////////////////// Search keywords UI //////////////////////////////////////////////////////////

function installKeywordsOnkeyupEvent() {
    $("#searchKeys").on('keyup', function () {
        clearTimeout(keywordsOnchangeTimger);
        keywordsOnchangeTimger = setTimeout(() => {
            cleanSearchKeywords();
            showPosts(true);
        }, keywordsOnchangeDelay);
    });
    $("#searchKeys").on('search', function () {
        showPosts(true);
    });
}
function cleanSearchKeywords() {
    /* Keep only keywords of 3 characters or more */
    let keywords = $("#searchKeys").val().trim().split(' ');
    let cleanedKeywords = "";
    keywords.forEach(keyword => {
        if (keyword.length >= minKeywordLenth) cleanedKeywords += keyword + " ";
    });
    $("#searchKeys").val(cleanedKeywords.trim());
}
function showSearchIcon() {
    $("#hiddenIcon").hide();
    $("#showSearch").show();
    if (showKeywords) {
        $("#searchKeys").show();
    }
    else
        $("#searchKeys").hide();
}
function hideSearchIcon() {
    $("#hiddenIcon").show();
    $("#showSearch").hide();
    $("#searchKeys").hide();
}
function toogleShowKeywords() {
    showKeywords = !showKeywords;
    if (showKeywords) {
        $("#searchKeys").show();
        $("#searchKeys").focus();
    }
    else {
        $("#searchKeys").hide();
        console.log(6);
        showPosts(true);
    }
}

/////////////////////////// Views management ////////////////////////////////////////////////////////////

function intialView() {
    if (user.Authorizations.writeAccess >= 2 && user.Authorizations.writeAccess < 3) {
        $("#createPost").show();
    }
    else {
        $("#createPost").hide();
    }
    $("#hiddenIcon").hide();
    $("#hiddenIcon2").hide();
    $('#menu').show();
    $('#commit').hide();
    $('#abort').hide();
    $('#form').hide();
    $('#Manager').hide();
    $('#form').empty();
    $('#aboutContainer').hide();
    $('#errorContainer').hide();
    showSearchIcon();
}
async function showPosts(reset = false) {
    intialView();
    $("#viewTitle").text("Fil de nouvelles");
    periodic_Refresh_paused = false;
    await postsPanel.show(reset);
}
function hidePosts() {
    postsPanel.hide();
    hideSearchIcon();
    $("#createPost").hide();
    $('#menu').hide();
    periodic_Refresh_paused = true;
}
function showForm() {
    hidePosts();
    $('#form').show();
    $('#commit').show();
    $('#abort').show();
}
function showManager(){
    hidePosts();
    $('#Manager').show();
    $('#abort').show();
}
function showError(message, details = "") {
    hidePosts();
    $('#form').hide();
    $('#form').empty();
    $("#hiddenIcon").show();
    $("#hiddenIcon2").show();
    $('#commit').hide();
    $('#abort').show();
    $("#viewTitle").text("Erreur du serveur...");
    $("#errorContainer").show();
    $("#errorContainer").empty();
    $("#errorContainer").append($(`<div>${message}</div>`));
    $("#errorContainer").append($(`<div>${details}</div>`));
}
function showCreatePostForm() {
    showForm();
    $("#viewTitle").text("Ajout de nouvelle");
    renderPostForm();
}
function showEditPostForm(id) {
    showForm();
    $("#viewTitle").text("Modification");
    renderEditPostForm(id);
}
function showDeletePostForm(id) {
    showForm();
    $("#viewTitle").text("Retrait");
    renderDeletePostForm(id);
}
function showAbout() {
    hidePosts();
    $("#hiddenIcon").show();
    $("#hiddenIcon2").show();
    $('#abort').show();
    $("#viewTitle").text("À propos...");
    $("#aboutContainer").show();
}
function ShowUserform() {
    showForm();
    $("#viewTitle").text("login");
    renderUserForm();
}
function showUserEditform() {
    showForm();
    $("#viewTitle").text("Modifications");
    renderUserEditForm();
}
function ShowLoginform() {
    showForm();
    $("#viewTitle").text("login");
    LoginForm();
}
function Showverifyform() {
    $('#form').show();
    $('#commit').hide();
    $('#abort').hide();
    $("#viewTitle").text("verification");
    VerifyForm();
}
function showUserManager(){
     showManager();
     $("#viewTitle").text("Gestion des utilisateurs");
     renderUsersManager();
}
function ShowDeleteUserForm(id){
    $("#viewTitle").text("Retrait");
    renderDeleteUserForm(id);
    $('#commit').hide();
    $('#abort').hide();
 }
//////////////////////////// Posts rendering ////////////////////////////////////////////////////////////

//////////////////////////// Posts rendering /////////////////////////////////////////////////////////////
function Userupdate()
{
    setInterval(async () => {
       
        user = await inituser();
    },
        periodicRefreshPeriod * 1000);

}
 function start_Periodic_Refresh() {
    setInterval(async () => {
        if (!periodic_Refresh_paused) {
            let etag = await Posts_API.HEAD();
            let etag2 = await Like_APi.HEAD();
            if (PostETag != etag) {
                PostETag = etag;
                await showPosts();
            }
            if (likeEtag != etag2) {
                likeEtag= etag2;
                await showPosts();
            } 
        updatePage();
        }
        /// make etag for when user etag change 
    
    },
        periodicRefreshPeriod * 1000);
}
async function updatePage(){
    if (user.Authorizations.writeAccess >= 2 && user.Authorizations.writeAccess < 3) {
        $("#createPost").show();
    }
    else {
        $("#createPost").hide();
    }
    updateDropDownMenu();
}
async function renderPosts(queryString) {
    let endOfData = false;
    queryString += "&sort=date,desc";
    await compileCategories();
    if (selectedCategory != "") queryString += "&category=" + selectedCategory;
    if (showKeywords) {
        let keys = $("#searchKeys").val().replace(/[ ]/g, ',');
        if (keys !== "")
            queryString += "&keywords=" + keys;
    }
    addWaitingGif();
    let response = await Posts_API.Get(queryString);
    if (!Posts_API.error) {
        currentETag = response.ETag;
        let Posts = response.data;
        if (Posts.length > 0) {
            for (let post of Posts) {
                let postHtml = await renderPost(post);
                postsPanel.itemsPanel.append(postHtml);
            }
        } else {
            endOfData = true;
        }
        linefeeds_to_Html_br(".postText");
        highlightKeywords();
        attach_Posts_UI_Events_Callback();
    } else {
        showError(Posts_API.currentHttpError);
    }
    removeWaitingGif();
    return endOfData;
}

async function renderPost(post) {
    let likes = await likesRendering(post.Id)
    let date = convertToFrenchDate(UTC_To_Local(post.Date));
    let crudIcon = PostEditRendring(post);
    return $(`
        <div class="post" id="${post.Id}">
            <div class="postHeader">
                ${post.Category}
                ${crudIcon}
                ${likes}
            </div>
            <div class="postTitle"> ${post.Title} </div>
            <img class="postImage" src='${post.Image}'/>
            <div class="postDate"> ${date} </div>
            <div postId="${post.Id}" class="postTextContainer hideExtra">
                <div class="postText" >${post.Text}</div>
            </div>
            <div class="postfooter">
                <span postId="${post.Id}" class="moreText cmdIconXSmall fa fa-angle-double-down" title="Afficher la suite"></span>
                <span postId="${post.Id}" class="lessText cmdIconXSmall fa fa-angle-double-up" title="Réduire..."></span>
            </div>         
        </div>
    `);
}
async function compileCategories() {
    categories = [];
    let response = await Posts_API.GetQuery("?fields=category&sort=category");
    if (!Posts_API.error) {
        let items = response.data;
        if (items != null) {
            items.forEach(item => {
                if (!categories.includes(item.Category))
                    categories.push(item.Category);
            })
            if (!categories.includes(selectedCategory))
                selectedCategory = "";
            updateDropDownMenu(categories);
        }
    }
}
function updateDropDownMenu() {
    let DDMenu = $("#DDMenu");
    let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
    DDMenu.empty();
    $("#DDMenu").append($(`
           <div class="dropdown-item menuItemLayout" id="">
           <div class="contactLayout">
           <div class="avatar" style="background-image:url('${user.Avatar}')"></div>
           <div class="contactName">${user.Name}</div>
           </div>
        </div>
        <hr>
        `));
        if(user.Authorizations.writeAccess == 3){
            DDMenu.append($(`
                <div class="dropdown-item menuItemLayout" id="UserManager">
                   <i class="MenuIcon fa fa-users-gear mx-2" style="color:rgb(0, 87, 204);;"></i>Gestion des Usagers
                </div>
                `));
        }
    if (user.Authorizations.readAccess > 0) {
        DDMenu.append($(`
                <div class="dropdown-item menuItemLayout" id="logout">
                   <i class="MenuIcon fa fa-right-to-bracket mx-2" style="color:rgb(0, 87, 204);;"></i>Déconnexion
                </div>
                `));
        DDMenu.append($(`
                    <div class="dropdown-item menuItemLayout" id="modify">
                       <i class="MenuIcon fa-solid fa-user-pen mx-2" style="color:rgb(0, 87, 204);;"></i>Modifier votre Profile
                    </div>
                    <hr>
                    `));

    }
    if (user.Authorizations.readAccess == 0) {
        DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="signup">
           <i class="MenuIcon fa fa-right-to-bracket mx-2" style="color:rgb(0, 87, 204);;"></i>Inscription
        </div>
        `));
        DDMenu.append($(`
                <div class="dropdown-item menuItemLayout" id="login">
                   <i class="MenuIcon fa-solid fa-right-to-bracket mx-2" style="color:rgb(250, 0, 0);;"></i>Connexion
                </div>
                `));
    }
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        `));
    DDMenu.append($(`<div class="dropdown-divider"></div>`));
    categories.forEach(category => {
        selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `));
    })
    DDMenu.append($(`<div class="dropdown-divider"></div> `));
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `));
    $('#aboutCmd').on("click", function () {
        showAbout();
    });
    $('#aboutCmd').on("click", function () {
        showAbout();
    });
    $('#allCatCmd').on("click", async function () {
        selectedCategory = "";
        console.log(8);
        await showPosts(true);
        updateDropDownMenu();
    });
    $('#UserManager').on("click", async function () {
        showUserManager();
    });
    $('#signup').on("click", async function () {
        ShowUserform();
    });
    $('#modify').on('click', async function () {
        showUserEditform(user);
    });
    $('#logout').on('click', async function () {
        resetCookie();
        location.reload(true);
        await Account_API.Logout(user.Id)
    }
    )
    $('#login').on("click", async function () {
        ShowLoginform();
    });
    $('.category').on("click", async function () {
        selectedCategory = $(this).text().trim();
        console.log(9);
        await showPosts(true);
        updateDropDownMenu();
    });
}
function attach_Posts_UI_Events_Callback() {

    linefeeds_to_Html_br(".postText");
    // attach icon command click event callback
    $(".editCmd").off();
    $(".editCmd").on("click", function () {
        showEditPostForm($(this).attr("postId"));
    });
    $(".deleteCmd").off();
    $(".deleteCmd").on("click", function () {
        showDeletePostForm($(this).attr("postId"));
    });
    $(".moreText").off();
    $(".moreText").click(function () {
        $(`.commentsPanel[postId=${$(this).attr("postId")}]`).show();
        $(`.lessText[postId=${$(this).attr("postId")}]`).show();
        $(this).hide();
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass('showExtra');
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass('hideExtra');
    })
    $(".lessText").off();
    $(".lessText").click(function () {
        $(`.commentsPanel[postId=${$(this).attr("postId")}]`).hide();
        $(`.moreText[postId=${$(this).attr("postId")}]`).show();
        $(this).hide();
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass('hideExtra');
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass('showExtra');

    })
    $(".likecmd").off().on("click", async function () {
        const postId = $(this).closest('.post').attr('id');
            const result = await Like_APi.addLike(postId,user.Id,getCookie('Token')); 
            if (result) {
                likeEtag = result.ETag
                const uiLikes = await likesRendering(postId);
                $(`#${postId} .likeContainer`).replaceWith(uiLikes); // Replace like container
                attach_Posts_UI_Events_Callback(); // Rebind events
            } else {
                console.error('Failed to add like.');
            }
        } 
    );
    $(".dislikecmd").off().on("click", async function () {
        const postId = $(this).closest('.post').attr('id');
        
            const result = await Like_APi.removeLike(postId, user.Id,getCookie('Token'));
            if (result) {
                likeEtag = result.ETag
                const uiLikes = await likesRendering(postId);
                $(`#${postId} .likeContainer`).replaceWith(uiLikes); // Replace like container
                attach_Posts_UI_Events_Callback(); // Rebind events
            } else {
                console.error('Failed to remove like.');
            }
    });
    
}

function addWaitingGif() {
    clearTimeout(waiting);
    waiting = setTimeout(() => {
        postsPanel.itemsPanel.append($("<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
    }, waitingGifTrigger)
}
function removeWaitingGif() {
    clearTimeout(waiting);
    $("#waitingGif").remove();
}
function PostEditRendring(post) {
    crudIcon = "";
    if (user.Authorizations.readAccess >= 2) {
        if (user.UserPosts.includes(post.Id)) {

            crudIcon =
                `
        <span class="editCmd cmdIcon fa fa-pencil" postId="${post.Id}" title="Modifier nouvelle"></span>
        <span class="deleteCmd cmdIcon fa fa-trash" postId="${post.Id}" title="Effacer nouvelle"></span>
        `;
        }
        if(user.Authorizations.writeAccess ==3 ){
            crudIcon =
            `
             <span class="deleteCmd cmdIcon fa fa-trash" postId="${post.Id}" title="Effacer nouvelle"></span>
             `;
        }
    }
    return crudIcon;
}
async function likesRendering(id) {
    let uiLikes = ""
    const likes = await Like_APi.getLikes(id);
    const hasLiked = likes.UsersId.includes(user.Id); 
    const totalLikes = likes.Total; 
    const title = likes.UsersId.join("\n");


    //todo get usernames to put in title

    if(user.Authorizations.readAccess >=1 && user.Authorizations.readAccess <3 ){
     uiLikes = `
        <div class="likeContainer" data-postid="${id}">
            <div>
                ${hasLiked 
                    ? `<i class="dislikecmd cmdIcon fa-solid fa-thumbs-down" data-postid="${id}" title="Unlike"></i>` 
                    : `<i class="likecmd  cmdIcon fa-regular fa-thumbs-up" data-postid="${id}" title="Like by ${title}"></i>`}
            </div>
            <div>${totalLikes}</div>
        </div>
    `;}

    return uiLikes;
}


/////////////////////// Posts content manipulation ///////////////////////////////////////////////////////

function linefeeds_to_Html_br(selector) {
    $.each($(selector), function () {
        let postText = $(this);
        var str = postText.html();
        var regex = /[\r\n]/g;
        postText.html(str.replace(regex, "<br>"));
    })
}
function highlight(text, elem) {
    text = text.trim();
    if (text.length >= minKeywordLenth) {
        var innerHTML = elem.innerHTML;
        let startIndex = 0;

        while (startIndex < innerHTML.length) {
            var normalizedHtml = innerHTML.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            var index = normalizedHtml.indexOf(text, startIndex);
            let highLightedText = "";
            if (index >= startIndex) {
                highLightedText = "<span class='highlight'>" + innerHTML.substring(index, index + text.length) + "</span>";
                innerHTML = innerHTML.substring(0, index) + highLightedText + innerHTML.substring(index + text.length);
                startIndex = index + highLightedText.length + 1;
            } else
                startIndex = innerHTML.length + 1;
        }
        elem.innerHTML = innerHTML;
    }
}
function highlightKeywords() {
    if (showKeywords) {
        let keywords = $("#searchKeys").val().split(' ');
        if (keywords.length > 0) {
            keywords.forEach(key => {
                let titles = document.getElementsByClassName('postTitle');
                Array.from(titles).forEach(title => {
                    highlight(key, title);
                })
                let texts = document.getElementsByClassName('postText');
                Array.from(texts).forEach(text => {
                    highlight(key, text);
                })
            })
        }
    }
}

//////////////////////// Forms rendering /////////////////////////////////////////////////////////////////

async function renderEditPostForm(id) {
    $('#commit').show();
    addWaitingGif();
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let Post = response.data;
        if (Post !== null)
            renderPostForm(Post);
        else
            showError("Post introuvable!");
    } else {
        showError(Posts_API.currentHttpError);
    }
    removeWaitingGif();
}
async function renderDeletePostForm(id) {
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let post = response.data;
        if (post !== null) {
            let date = convertToFrenchDate(UTC_To_Local(post.Date));
            $("#form").append(`
                <div class="post" id="${post.Id}">
                <div class="postHeader">  ${post.Category} </div>
                <div class="postTitle ellipsis"> ${post.Title} </div>
                <img class="postImage" src='${post.Image}'/>
                <div class="postDate"> ${date} </div>
                <div class="postTextContainer showExtra">
                    <div class="postText">${post.Text}</div>
                </div>
            `);
            linefeeds_to_Html_br(".postText");
            // attach form buttons click event callback
            $('#commit').on("click", async function () {
                await Posts_API.Delete(post.Id);
                if (!Posts_API.error) {
                    console.log(10);
                    await showPosts();
                }
                else {
                    console.log(Posts_API.currentHttpError)
                    showError("Une erreur est survenue!");
                }
            });
            $('#cancel').on("click", async function () {
                await showPosts();
            });
        } else {
            showError("Post introuvable!");
        }
    } else
        showError(Posts_API.currentHttpError);
}
function newPost() {
    let Post = {};
    Post.Id = 0;
    Post.Title = "";
    Post.Text = "";
    Post.Image = "news-logo-upload.png";
    Post.Category = "";
    return Post;
}
function newContact() {
    contact = {};
    contact.Id = 0;
    contact.Name = "";
    contact.Phone = "";
    contact.Email = "";
    contact.UserPosts=[];
    return contact;
}
function renderUserEditForm() {
    let create = false;
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="contactForm">
            <input type="hidden" name="Id" id="Id" value="${user.Id}"/>
            <label for="Name" class="form-label">Nom </label>
            <input 
                class="form-control Alpha"
                name="Name" 
                id="Name" 
                placeholder="Nom"
                required
                RequireMessage="Veuillez entrer un nom"
                InvalidMessage="Le nom comporte un caractère illégal" 
                value="${user.Name}"
            />
            <label for="Email" class="form-label">Courriel </label>
            <input 
                class="form-control Email"
                name="Email"
                id="Email"
                placeholder="Courriel"
                required
                RequireMessage="Veuillez entrer votre courriel" 
                InvalidMessage="Veuillez entrer un courriel valide"
                CustomErorMessage="Couriel déjas utilisé"
                value="${user.Email}"
            />
            <br>
            <input 
             class="form-control MatchedInput"
             placeholder="Verification"
             matchedInputId="Email"
             value="${user.Email}"
             required
             RequireMessage="Veuillez confirmer le courriel"
              />

             <label for="Password" class="form-label">Mot de passe</label>
            <input 
                type ="password"
                class="form-control Password"
                name="Password"
                id="Password"
                placeholder="mot de passe"
                required
                RequireMessage="Veuillez entrer un mot de passe" 
                InvalidMessage="Veuillez entrer un Mot de passe"
                autocomplete="off"
            />
            <input 
             class="form-control MatchedInput"
             placeholder="Verification"
             matchedInputId="Password"
             required
             RequireMessage="Veuillez confirmer le mot passe"
             autocomplete="off"
              />

            <label class="form-label">Avatar </label>
            <div   class='imageUploader' 
                   newImage='${create}' 
                   controlId='Avatar' 
                   imageSrc='${user.Avatar}'
                   waitingImage="Loading_icon.gif">
            </div>
            <hr>
            <input type="submit" value="Enregistrer" id="saveUser" class="btn btn-primary">
            <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
            <input type="button" value="Effacer le compte" id="effacer" class="btn btn-danger">
        </form>
    `);
    addConflictValidation("http://localhost:5000/accounts/conflict", "Email", "saveUser");
    initImageUploaders();
    initFormValidation();
    $('#contactForm').off("submit").on("submit", async function (event) {
        event.preventDefault();
        let User = getFormData($("#contactForm"));
        User.UserPosts  = user.UserPosts;
        let emailchange = User.Email != user.Email
        let result = await Account_API.modify(User, getCookie('Token'));
        if (result) {
            let expiryTime = result.data.Expire_Time * 1000; // Convert to milliseconds
            let expires = new Date(expiryTime).toUTCString();
            document.cookie = `Token=${result.data.Access_token}; expires=${expires}; path=/; Secure;SameSite=Strict`;
            user = await inituser();
            if (emailchange) {
                Showverifyform();
            } else {
                showPosts();
            }
        } else {
            renderError("An error occurred: " + API_getcurrentHttpError());
        }
    }
    );
    $('#cancel').on("click", function () {
        showPosts();
    });
    $('#effacer').on("click", async function (){
        DeleteUserForm();
    })
}
function renderUserForm() {
    let create = true;
        $("#viewTitle").text("Inscription");
        let User = newContact();
        User.Avatar = "images/no-avatar.png";

    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="contactForm">
            <input type="hidden" name="Id" id="Id" value="${User.Id}"/>
            <label for="Name" class="form-label">Nom </label>
            <input 
                class="form-control Alpha"
                name="Name" 
                id="Name" 
                placeholder="Nom"
                required
                RequireMessage="Veuillez entrer un nom"
                InvalidMessage="Le nom comporte un caractère illégal" 
                value="${User.Name}"
            />
            <label for="Email" class="form-label">Courriel </label>
            <input 
                class="form-control Email"
                name="Email"
                id="Email"
                placeholder="Courriel"
                required
                RequireMessage="Veuillez entrer votre courriel" 
                InvalidMessage="Veuillez entrer un courriel valide"
                CustomErorMessage="Couriel déjas utilisé"
                value="${User.Email}"
            />
            <br>
            <input 
             class="form-control MatchedInput"
             placeholder="Verification"
             matchedInputId="Email"
             value="${User.Email}"
             required
             RequireMessage="Veuillez confirmer le courriel"
              />
             <label for="Password" class="form-label">Mot de passe</label>
            <input 
                class="form-control Password"
                name="Password"
                id="Password"
                type="password"
                placeholder="mot de passe"
                required
                RequireMessage="Veuillez entrer un mot de passe" 
                InvalidMessage="Veuillez entrer un Mot de passe"
                value="${User.Password}"
            />
            <input 
            type="password"
             class="form-control MatchedInput"
             placeholder="Verification"
             matchedInputId="Password"
             required
             RequireMessage="Veuillez confirmer le mot passe"
              />
            

            <!-- nécessite le fichier javascript 'imageControl.js' -->
            <label class="form-label">Avatar </label>
            <div   class='imageUploader' 
                   newImage='${create}' 
                   controlId='Avatar' 
                   imageSrc='${User.Avatar}' 
                   waitingImage="Loading_icon.gif">
            </div>
            <hr>
            <input type="submit" value="Enregistrer" id="saveUser" class="btn btn-primary">
            <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
        </form>
    `);
    addConflictValidation("http://localhost:5000/accounts/conflict", "Email", "saveUser");
    initImageUploaders();
    initFormValidation();
    $('#contactForm').off("submit").on("submit", async function (event) {
        event.preventDefault();
        let User = getFormData($("#contactForm"));
        console.log(User);
        let result = await Account_API.Register(User);
        console.log(result);
        if (result) {
            console.log("Registration succeeded");
            ShowLoginform();
        } else {
            renderError("An error occurred: " + API_getcurrentHttpError());
        }
    }
    );
    $('#cancel').on("click", function () {
        showPosts();
    });
} function showWaitingGif() {
    $("#content").append($("<div class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
}
function renderPostForm(post = null) {
    let create = post == null;
    if (create) post = newPost();
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="postForm">
            <input type="hidden" name="Id" value="${post.Id}"/>
             <input type="hidden" name="Date" value="${post.Date}"/>
            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${post.Category}"
            />
            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${post.Title}"
            />
            <label for="Url" class="form-label">Texte</label>
             <textarea class="form-control" 
                          name="Text" 
                          id="Text"
                          placeholder="Texte" 
                          rows="9"
                          required 
                          RequireMessage = 'Veuillez entrer une Description'>${post.Text}</textarea>

            <label class="form-label">Image </label>
            <div class='imageUploaderContainer'>
                <div class='imageUploader' 
                     newImage='${create}' 
                     controlId='Image' 
                     imageSrc='${post.Image}' 
                     waitingImage="Loading_icon.gif">
                </div>
            </div>
            <div id="keepDateControl">
                <input type="checkbox" name="keepDate" id="keepDate" class="checkbox" checked>
                <label for="keepDate"> Conserver la date de création </label>
            </div>
            <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary displayNone">
        </form>
    `);
    if (create) $("#keepDateControl").hide();

    initImageUploaders();
    initFormValidation(); // important do to after all html injection!

    $("#commit").click(function () {
        $("#commit").off();
        return $('#savePost').trigger("click");
    });
    $('#postForm').on("submit", async function (event) {
        event.preventDefault();
        let post = getFormData($("#postForm"));
        if (post.Category != selectedCategory)
            selectedCategory = "";
        if (create || !('keepDate' in post))
            post.Date = Local_to_UTC(Date.now());
        delete post.keepDate;
        post = await Posts_API.Save(post, create);
        if (!Posts_API.error) {
            if(create){
                let result = await Account_API.addpost(user,getCookie('Token'),post.Id)
                console.log(result);
                let expiryTime = result.data.Expire_Time * 1000; // Convert to milliseconds
                let expires = new Date(expiryTime).toUTCString();
                document.cookie = `Token=${result.data.Access_token}; expires=${expires}; path=/; Secure;SameSite=Strict`;
                user = await inituser();
                location.reload(true);
            }
            user = await inituser();
            await showPosts();
            postsPanel.scrollToElem(post.Id);
        }
        else
            showError("Une erreur est survenue! ", Posts_API.currentHttpError);
    });
    $('#cancel').on("click", async function () {
        await showPosts();
    });
}
function getFormData($form) {
    // prevent html injections
    const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
    var jsonObject = {};
    // grab data from all controls
    $.each($form.serializeArray(), (index, control) => {
        jsonObject[control.name] = control.value.replace(removeTag, "");
    });
    return jsonObject;
}
function LoginForm(verify = false) {
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="LoginForm">
            <label for="Email" class="form-label">Courriel </label>
            <input 
                class="form-control Email"
                name="Email"
                id="Email"
                placeholder="Courriel"
                required
                RequireMessage="Veuillez entrer votre courriel" 
                InvalidMessage="Veuillez entrer un courriel valide"
                CustomErorMessage="Couriel déjas utilisé"
              />
                <div id="emailError" class="error-message"></div>
             <label for="Password" class="form-label">Mot de passe</label>
            <input 
                class="form-control Password"
                name="Password"
                id="Password"
                type="password"
                placeholder="mot de passe"
                required
                RequireMessage="Veuillez entrer un mot de passe" 
                InvalidMessage="Veuillez entrer un Mot de passe"
            />
             <div id="passwordError" class="error-message"></div>
             <div id="block" class="error-message"></div>
            
            <input type="submit" value="Enter" id="saveUser" class="btn btn-primary">
        </form>
    `);
    $('#LoginForm').on("submit", async function (event) {
        event.preventDefault();
        ErraseError();
        let data = getFormData($("#LoginForm"));
        let result = await Account_API.Login(data);
        if (result && result.User.Authorizations.writeAccess != -1)  {
            let expiryTime = result.Expire_Time * 1000; // Convert to milliseconds
            let expires = new Date(expiryTime).toUTCString();
            document.cookie = `Token=${result.Access_token}; expires=${expires}; path=/; Secure;SameSite=Strict`;
            user = await inituser();
            startSessiontimeout();
            if (user.VerifyCode === "verified") {
                showPosts();
            }
            else {
                Showverifyform();
            }
        } else {
            const errorMessage = Account_API.API_getcurrentHttpError();
            if (errorMessage.includes("email")) {
                renderError("#emailError", "Couriel introuvable");
            } else if (errorMessage.includes("password")) {
                renderError("#passwordError", "Mot de passe incorrect.");
            }else if(result.User.Authorizations.writeAccess == -1){
                renderError("#block", "votre compte à été bloquer");
            }
        }
    });
}
function VerifyForm() {
    $("#form").empty();
    $("#form").append(`
        <div> votre compte a été crée. veulillez prendre vos couriels</div>
        <form class="form" id="verifyform">
            <label for="verif" class="form-label">Courriel </label>
            <input 
                class="form-control
                name="code"
                id="code"
                placeholder="verify Code"
                required
                CustomErorMessage="Mauvais code de vérification"
              />
                <div id="emailError" class="error-message"></div>
            <input type="submit" value="Enter" id="verify" class="btn btn-primary">
        </form>
    `);
    $('#verifyform').on("submit", async function (event) {
        event.preventDefault();
        ErraseError();
        let code = $("#code").val();
        let result = await Account_API.verify(user.Id, code)
        if (result) {
            showPosts();
        }
    });

}
function renderError(selector, message) {
    $(selector).text(message);
}
function ErraseError() {

    $('#emailError').empty();
    $('#passwordError').empty();

}
function getCookie(name) {
    let cookies = document.cookie.split('; ');
    let cookie = cookies.find(row => row.startsWith(name + '='));
    return cookie ? cookie.split('=')[1] : null;
}
function resetCookie(){
    document.cookie = `Token=; expires=; path=/; Secure;SameSite=Strict`;
}
///////////////////////////////////////////user rendering///////////////////////////////////////////////
async function renderUsersManager() {
    $('#Manager').empty();
    id="";
    let Users = await Account_API.AdminGetUser(id="",getCookie('Token'))
    if (Users !== null) {
        Users.data.forEach(U => {
             if(U.Id != user.Id)
            $("#Manager").append(renderUser(U,logoPromotion(U),logoblock(U)));
        });
        $('#Manager').off("click", ".promote").on("click", ".promote", async function () {
            const userId = $(this).data("id"); 
            let User = await Account_API.AdminGetUser(userId, getCookie('Token'));
            let updateduser = await Account_API.AdminPromoteUser(User.data, getCookie('Token')); 
            let newAccessLogo = logoPromotion(updateduser);
            $(this).removeClass().addClass(`promote ${newAccessLogo}`);
        });
        
        $('#Manager').off("click", ".block").on("click", ".block", async function () {
            const userId = $(this).data("id"); 
            let User = await Account_API.AdminGetUser(userId, getCookie('Token'));
            let updateduser = await Account_API.AdminBlockUser(User.data, getCookie('Token')); 
            let newAccessLogo = logoblock(updateduser);
            $(this).removeClass().addClass(`block ${newAccessLogo}`);
        });
        $(".deleteUserCmd").on("click", function () {
            const deleteUserId = $(this).attr("deleteUserId");
            console.log(deleteUserId); // Chec
            ShowDeleteUserForm($(this).attr("deleteUserId"));
        });
        $(".contactRow").on("click", function (e) { e.preventDefault(); })
    } else {
        renderError("Service introuvable");
    }

}
function logoPromotion(User){
    switch(User.Authorizations.readAccess){
        case 1 : return 'fa-solid fa-user'
         case 2 : return 'fa-solid fa-user-plus'  
         case  3 : return 'fa-solid fa-user-tie'
    }   
}
function logoblock(User ) {
   return  User.Authorizations.readAccess - 1 ? 'fa-solid fa-user-slash': 'fa-solid fa-user'
  }

function renderUser(User, accessLogo,blockIcon) {
    return $(`
     <div class="userRow" User_id="${User.Id}">
        <div class="userContainer noselect">
                 <div class="avatar" style="background-image:url('${User.Avatar}')"></div>
                 <div class="userInfo">
                    <span class="userName">${User.Name}</span>
                </div>
            <i class="promote ${accessLogo}" data-id="${User.Id}"></i> <!-- Store User.Id here -->
            <i class="block ${blockIcon}"  data-id="${User.Id}"></i>
            <i class="deleteUserCmd fa-solid fa-trash-can" deleteUserId="${User.Id}"></i>
        </div>
    </div>           
    `);
}
async function renderDeleteUserForm(id) {
            let User = await Account_API.AdminGetUser(id,getCookie('Token'))
            $('#Manager').empty();
            $("#Manager").append(`
        <div class="userContainer noselect">
                 <div class="avatar" style="background-image:url('${User.data.Avatar}')"></div>
                 <div class="userInfo">
                    <span class="userName">${User.data.Name}</span>
                </div>
                <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
                <input type="button" value="Effacer le compte" id="effaceruser" class="btn btn-danger">
        </div>
      </div>              
            `);
            $('#effaceruser').on("click", async function () {
                Account_API.Delete(id,getCookie('Token'));
                await showUserManager();
            });
            $('#cancel').on("click", async function () {
                 await showUserManager();
                
            });
        } 
        async function DeleteUserForm(id) {
         await Account_API.AdminGetUser(id,getCookie('Token'))
            $('#form').empty();
            $("#form").append(`
                <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
                <input type="button" value="Effacer le compte" id="effaceruserd" class="btn btn-danger">
        </div>
      </div>              
            `);$('#effaceruserd').off("click").on("click", async function () {
                const $button = $(this);
                $button.prop("disabled", true).text("Processing...");
            
                try {
                    // Optimistically update the UI
                    showPosts(); // Refresh the posts view immediately
            
                    // Perform deletions
                    if (user.UserPosts.length > 0) {
                        for (const post of user.UserPosts) {
                            await Posts_API.Delete(post);
                        }
                    }
            
                    await Like_APi.removebyuser(user.Id);
                    await Account_API.Delete(user.Id, getCookie('Token'));
                    document.cookie = `Token=; expires=; path=/; Secure; SameSite=Strict`;
                } catch (error) {
                    console.error("Error during deletion process:", error);
                    alert("An error occurred while deleting the user. Please try again.");
                } finally {
                    $button.prop("disabled", false).text("Delete User");
                }
            });
            
            
            $('#cancel').on("click", async function () {
                 showUserEditform();
            });
        } 
 function Sessionexpired(){
    hidePosts();
    Account_API.Logout(user.Id)
    noTimeout();
    ShowLoginform();
 }