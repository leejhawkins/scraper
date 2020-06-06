$(document).ready(function () {
    $('.pushpin').pushpin();
    $('.sidenav').sidenav();
});
$(document).on("click","#scrape", function(){
    $.ajax({
        method: "GET",
        url: "/scrape"
    }).then(function(){
        location.reload()
    })
})
$(document).on("click","#link",function(){
    window.location.assign("https://www.politifact.com"+$(this).attr("data-link"))
})

$(document).on("click", ".note-btn", function () {
    // Empty the notes from the note section
    $("#notes").empty();
    // Save the id from the p tag
    var thisId = $(this).attr("data-id");
    var thisLink = $(this).attr("href")

    // Now make an ajax call for the Article
    $.ajax({
        method: "GET",
        url: "/articles/" + thisId
    })
        // With that done, add the note information to the page
        .then(function (data) {
            // The title of the article
            console.log(data)
            $("#notes").append("<h5><u> Claim</u>:</h5><p>" + data.title + "</hp>");
            $("#notes").append("<h5><u> Rating</u>: <img src="+data.rating+" style="+"height:50px"+"></h5><h5><u>Summary:</u></h5>")
            $("#notes").append("<button class= 'btn-small blue darken-1' type='button' data-link='"+ data.link + "' id='link'>Link to Site</button>")
            for (let i=0;i<data.summary.length;i++) {
                $("#notes").append("<p>" + data.summary[i] + "</hp>");
            }
            $("#notes").append("<h5><u> Comments: </u></h5>")
            if (data.note) {
                for (let i=0;i<data.note.length;i++) {
                    $("#notes").append("<p> "+data.note[i].title+ "</p><p class='blue lighten-5'>"+data.note[i].body+"</p><br>")
                }
            }
            $("#notes").append("<input id='titleinput' name='title' placeholder='Name' >")
            // A textarea to add a new note body
            $("#notes").append("<textarea id='bodyinput' name='body' placeholder='Comment'></textarea>");
            // A button to submit a new note, with the id of the article saved to it
            $("#notes").append("<button data-id='" + data._id + "' id='savenote'>Save Comment</button>");

            // If there's a note in the article
            
        });
});



// When you click the savenote button
$(document).on("click", "#savenote", function () {
    // Grab the id associated with the article from the submit button
    var thisId = $(this).attr("data-id");

    // Run a POST request to change the note, using what's entered in the inputs
    $.ajax({
        method: "POST",
        url: "/articles/" + thisId,
        data: {
            // Value taken from title input
            title: $("#titleinput").val(),
            // Value taken from note textarea
            body: $("#bodyinput").val()
        }
    })
        // With that done
        .then(function (data) {
            // Log the response
            console.log(data);
            // Empty the notes section
            $("#notes").empty();
        });

    // Also, remove the values entered in the input and textarea for note entry
    $("#titleinput").val("");
    $("#bodyinput").val("");
});
