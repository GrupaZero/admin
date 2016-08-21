<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="">
    <meta name="author" content="">
    <link rel="icon" href="../../favicon.ico">

    <title>G-ZERO ADMIN</title>

    <!-- core CSS -->
    <link rel="stylesheet" href="/gzero/admin/css/application.css">

    <!-- HTML5 shim and Respond.js IE8 support of HTML5 elements and media queries -->
    <!--[if lt IE 9]>
    <script src="https://oss.maxcdn.com/html5shiv/3.7.2/html5shiv.min.js"></script>
    <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
    <![endif]-->
    <script type="application/javascript">
        var token = localStorage.getItem('gzero_api_token');

        function redirectToAdmin() {
            window.location = '{{ route('admin') }}';
        }

        if (token) {
            redirectToAdmin();
        }
    </script>
</head>

<body>
<div class="container">
    <div class="col-md-4 col-md-offset-4">
        <div class="panel panel-default">
            <div class="page-header no-margin text-center">
              <h2>
                  <span class="semi-bold">G-ZERO</span> ADMIN
              </h2>
            </div>
            <div class="panel-body">
                <form id="admin-login-form" method="POST" role="form">
                    <div class="form-group">
                        <label class="control-label" for="email">@choice('common.email', 1)</label>
                        <input type="email" id="email" name="email" class="form-control"
                               value="{{old('email')}}"
                               placeholder="@choice('common.email', 1)">
                    </div>
                    <div class="form-group">
                        <label class="control-label" for="password">@lang('common.password')</label>
                        <input type="password" id="password" name="password" class="form-control"
                               placeholder="@lang('common.password')">
                    </div>
                    <button type="submit" class="btn btn-primary btn-lg btn-block">@lang('common.login')</button>
                    <hr>
                    <div class="text-center">
                        <a href="{{ route('home') }}"> @lang('common.backtoHomepage')</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
<div class="loading-mask" style="display: none;"><!-- loading container --></div>
</body>
<script src="//cdnjs.cloudflare.com/ajax/libs/jquery/2.1.3/jquery.min.js"></script>
<script type="text/javascript">
    $(function() {
        $('#admin-login-form').submit(function(event) {
            event.preventDefault();
            Loading.start();
            $.ajax({
                url: "{{ route('api.login') }}",
                data: $('#admin-login-form').serializeObject(),
                type: 'POST',
                success: function(xhr) {
                    Loading.stop();
                    clearFormValidationErrors();
                    if (typeof(Storage) !== "undefined") {
                        localStorage.setItem('gzero_api_token', xhr.token);
                        window.location = '{{ route('admin') }}';
                    } else {
                        alert('Sorry! You browser need to support Web Storage in order to log in')
                    }
                },
                error: function(xhr, status, error) {
                    Loading.stop();
                    if (typeof xhr.responseJSON !== 'undefined') {
                        // clear previous errors
                        clearFormValidationErrors();
                        $.each(xhr.responseJSON.errors, function(index, error) {
                            // set form errors
                            setFormValidationErrors(index, error);
                        });
                    }
                }
            });
        })
    });

    /**
     * Serialize form to object
     * @returns {{}}
    */
    $.fn.serializeObject = function() {
        var o = {};
        var a = this.serializeArray();
        $.each(a, function() {
            if (o[this.name] !== undefined) {
                if (!o[this.name].push) {
                    o[this.name] = [o[this.name]];
                }
                o[this.name].push(this.value || '');
            } else {
                o[this.name] = this.value || '';
            }
        });
        return o;
    };

    /**
     * Function sets form validation errors in form
     *
     * @param fieldName name of the field with errors occurred
     * @param message  error message to append
     *
     */
    function setFormValidationErrors(fieldName, message) {
        var field = $('input[name=' + fieldName + ']').parent('.form-group'); // get the field
        if (field.hasClass('has-error')) { // if already has error, then set new message
            field.find('.help-block').text(message);
        } else { // append error with html
            field.addClass('has-error').append('<p class="help-block">' + message + '</p>');
        }
    }

    /**
     * Function removes form validation errors
     */
    function clearFormValidationErrors() {
        var error = $(".form-group.has-error");
        error.removeClass('has-error');
        error.find('.help-block').remove();
    }

    /*Loading object*/
    var Loading = {
        loadingContainer: '.loading-mask',
        loadingMinHeight: 200,
        start: function() {
            var me = this;
            $(me.loadingContainer).fadeIn();
        },
        stop: function() {
            var me = this;
            $(me.loadingContainer).fadeOut();
        }
    };
</script>
