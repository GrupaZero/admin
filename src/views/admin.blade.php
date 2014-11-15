<!DOCTYPE html>
<html lang="en" ng-app="admin">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="">
    <meta name="author" content="">
    <link rel="icon" href="../../favicon.ico">

    <title>G-ZERO Admin</title>

    <!-- core CSS -->
    <link rel="stylesheet" href="/packages/gzero/admin/css/application.css">

    <!-- HTML5 shim and Respond.js IE8 support of HTML5 elements and media queries -->
    <!--[if lt IE 9]>
    <script src="https://oss.maxcdn.com/html5shiv/3.7.2/html5shiv.min.js"></script>
    <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
    <![endif]-->
    <script type="application/javascript">
        var Config = {
            url : '{{ Request::root() }}',
            apiUrl: 'http://api.{{ Request::getHTTPHost()}}'
        };
        var modules = [
        @foreach ($modules->getModulesNames() as $moduleName)
             "{{ $moduleName }}",
        @endforeach
        ];
    </script>
</head>

<body ng-controller="CoreCtrl">

<div class="navbar navbar-inverse navbar-fixed-top" role="navigation">
    <div class="container-fluid">
        <div class="navbar-header">
            <a class="navbar-brand" ui-sref="home">G-ZERO ADMIN</a>
            <div class="navbar-form navbar-left col-xs-4">
                <select ng-model="currentLang" ng-change="changeLanguage()" class="form-control"
                    ng-options="lang.code | langName | translate for lang in langs"></select>
            </div>
            <button type="button" class="navbar-toggle" ng-click="showSidebar = !showSidebar">
                <span class="sr-only">Toggle navigation</span>
                <span class="icon-bar"></span>
                <span class="icon-bar"></span>
                <span class="icon-bar"></span>
            </button>
        </div>
        <div class="navbar-collapse collapse">
            <button type="button" class="btn btn-lg btn-primary" bs-dropdown="topNav.exportToTargetMenu()">
                Menu
            </button>
            <ul class="nav navbar-nav navbar-right">
                <li ui-sref-active="active"><a ui-sref="home" translate="DASHBOARD"></a></li>
            </ul>
            <form class="navbar-form navbar-right">
                <input type="text" class="form-control" placeholder="Search..." ng-model="yourName">
            </form>
        </div>
    </div>
</div>
<div class="container-fluid">
    <div class="row row-offcanvas left" ng-class="{ 'is-active': showSidebar, '' : !showSidebar }">
        <div class="col-sm-3 col-md-2 sidebar-c-offcanvas">
            <ul class="nav nav-c-sidebar">
                <li ui-sref-active="active" ng-repeat="link in navBar.getItems()">
                    <a ui-sref="@{{ link.action }}">@{{ link.title | translate }}</a>
                    <ul class="nav">
                        <li ui-sref-active="active" ng-repeat="subLink in link.children">
                            <a ui-sref="@{{ subLink.action }}">@{{ subLink.title | translate }}</a>
                        </li>
                    </ul>
                </li>
            </ul>
        </div>
    <div class="col-sm-9 col-sm-offset-3 col-md-10 col-md-offset-2 main"  ng-click="showSidebar = false">
        <div ui-view></div>
    </div>
</div>
<div class="loading-mask"><!-- Loading Mask --></div>
<!-- core JavaScript
================================================== -->
<!-- Placed at the end of the document so the pages load faster -->
<script src="/packages/gzero/admin/js/vendor.min.js"></script>
<script src="/packages/gzero/admin/js/admin.min.js"></script>
@foreach ($modules->getModulesPaths() as $modulePath)
     <script src="{{ $modulePath }}"></script>
@endforeach
</body>
</html>
