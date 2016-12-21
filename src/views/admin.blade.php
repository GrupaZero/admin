<!DOCTYPE html>
<html lang="en" ng-app="admin">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="">
    <meta name="author" content="">
    <link rel="icon" href="../../favicon.ico">

    <title>G-ZERO ADMIN</title>

    <script>
        window.Laravel = <?php echo json_encode([
            'csrfToken' => csrf_token(),
        ]); ?>

    </script>

    <!-- core CSS -->
    <link rel="stylesheet" href="/gzero/admin/css/application.css">

    <!-- HTML5 shim and Respond.js IE8 support of HTML5 elements and media queries -->
    <!--[if lt IE 9]>
    <script src="https://oss.maxcdn.com/html5shiv/3.7.2/html5shiv.min.js"></script>
    <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
    <![endif]-->
    <script type="application/javascript">

        var Config = {
            url: '{{ request()->root() }}',
            domain: '{{ config("gzero.domain") }}',
            multilang: '{{ config("gzero.multilang.enabled") ? 'true' : 'false' }}',
            apiUrl: '{{ request()->getScheme() }}://api.{{ request()->getHTTPHost() }}',
            seoDescriptionLength: '{{ config("gzero.seoDescLength") }}',
            seoDescriptionAlternativeField: '{{ config("gzero.seoDescriptionAlternativeField") }}',
            seoTitleAlternativeField: '{{ config("gzero.seoTitleAlternativeField") }}',
            currentUserId: {{ auth()->user()->id }},
            contentTypes: {!! json_encode(array_keys(config("gzero.content_type")), true) !!},
            blockTypes: {!! json_encode(array_keys(config("gzero.block_type")), true) !!},
            fileTypes: {!! json_encode(array_keys(config("gzero.file_type")), true) !!},
            fileExtensions: {!! json_encode(config("gzero.allowed_file_extensions"), true) !!},
            blockRegions: {!! json_encode(config("gzero.available_blocks_regions"), true) !!},
            defaultLangCode: {!! json_encode(config("app.locale"), true) !!}
        };
        var modules = [
            @foreach ($modules->getModulesNames() as $moduleName)
                "{{ $moduleName }}",
            @endforeach
        ];
    </script>
</head>

<body ng-controller="CoreCtrl" class="mini-sidebar"
      ng-class="{'is-sidebar': $state.current.views.quickSidebarLeft, 'animate-on': !$state.current.views.contentTab}">
<script type="text/ng-template" id="dropdown-template">
    <ul tabindex="-1" class="dropdown-menu" role="menu">
        <li role="presentation" ng-class="{divider: item.divider}" ng-repeat="item in content">
            <a role="menuitem" tabindex="-1"
               ng-href="@{{ item.href }}"
               ng-if="!item.divider && item.href"
               target="@{{ item.target || '' }}"
               ng-bind="item.text"></a>

            <a role="menuitem" tabindex="-1"
               ui-sref="@{{ item.action }}"
               ng-if="!item.divider && item.action"
               ng-bind="item.text">@{{ item.action }}</a>

            <a role="menuitem" tabindex="-1" href="javascript:void(0)" ng-if="!item.divider && item.click"
               ng-click="$eval(item.click);$hide()" ng-bind="item.text"></a>
        </li>
    </ul>
</script>

<div class="navbar navbar-inverse navbar-fixed-top" role="navigation" ng-cloak>
    <div class="container-fluid">
        <div class="row">
            <div class="col-xs-6 col-sm-3 col-md-2 brand-box">
                <button type="button" class="navbar-toggle pull-left" ng-click="showSidebar = !showSidebar">
                    <span class="sr-only">@{{ 'TOGGLE_NAVIGATION' | translate }}</span>
                    <span class="icon-bar"></span>
                    <span class="icon-bar"></span>
                    <span class="icon-bar"></span>
                </button>
                <a class="navbar-brand" ui-sref="home">G-ZERO ADMIN</a>
            </div>
            <div class="col-xs-6 col-sm-9 col-md-10">
                <div class="navbar-form navbar-left" ng-if="showTransLangSwitcher && isMultiLangEnabled">
                    <label for="langCode" class="hidden-xs">@{{ 'TRANSLATION_LANGUAGE' | translate }}</label>
                    <select id="langCode" ng-model="transLang" class="form-control" ng-change="selectLanguage(transLang)"
                            ng-options="lang.code | langName | translate for lang in langs">
                    </select>
                </div>
                <ul class="nav navbar-nav navbar-right hidden-xs">
                    <li ng-repeat="link in topNavBar">

                        <a ng-if="!link.children && link.action" ui-sref="@{{ link.action }}">@{{ link.title | translate }}</a>

                        <a ng-if="!link.children && !link.action" target="__blank"
                           href="@{{ link.url }}">@{{ link.title | translate }}
                        </a>

                        <a ng-if="link.children">@{{ link.title | translate }} <span class="caret"></span></a>
                        <ul ng-if="link.children" class="dropdown-menu" role="menu">
                            <li ui-sref-active="active" ng-repeat="subLink in link.children">
                                <a ng-if="subLink.action" ui-sref="@{{ subLink.action }}">
                                    @{{ subLink.title | translate }}
                                </a>
                                <a ng-if="!subLink.action" href="@{{ subLink.url }}">
                                    @{{ subLink.title | translate }}
                                </a>
                            </li>
                        </ul>
                    </li>
                </ul>
                <div class="navbar-form navbar-right hidden-xs">
                    <select ng-model="currentLang" ng-change="selectAdminLang()" class="form-control"
                            ng-disabled="showAdminLangSwitcher" ng-show="isMultiLangEnabled"
                            ng-options="lang.code | langName | translate for lang in langs"></select>
                </div>
            </div>
        </div>
    </div>
</div>
<div class="container-fluid" ng-cloak>
    <div class="row row-offcanvas left" ng-class="{ 'is-active': showSidebar, '' : !showSidebar }">
        <div class="col-sm-3 col-md-2 sidebar-c-offcanvas">
            <ul class="nav nav-c-sidebar">
                <li ng-repeat="link in navBar" ng-class="{ active: $state.includes(link.action.split('.')[0]) }">
                    <a ui-sref="@{{ link.action }}">
                        <i ng-if="link.icon" class="icon @{{ link.icon }}" title="@{{ link.title | translate }}"></i>
                        <span class="title">@{{ link.title | translate }}</span>
                    </a>
                    <ul class="nav">
                        <li ng-repeat="subLink in link.children"
                            ng-class="{ active: $state.includes(subLink.action.split('.')[0]) }">
                            <a ui-sref="@{{ subLink.action }}">
                                <i ng-if="subLink.icon" class="icon @{{ subLink.icon }}"
                                   title="@{{ subLink.title | translate }}"></i>
                                <span class="title">@{{ subLink.title | translate }}</span>
                            </a>
                        </li>
                    </ul>
                </li>
            </ul>
        </div>
        <div class="col-sm-9 col-sm-offset-3 col-md-10 col-md-offset-2 main" ng-click="showSidebar = false">
            <div ui-view></div>
        </div>
    </div>
</div>
<div class="loading-mask" ng-show="showMask"><!-- Loading Mask --></div>
<div ng-http-loader methods="['POST', 'PUT']" template="gzero/admin/views/partials/loader.tpl.html"></div>
<!-- core JavaScript
================================================== -->
<!-- Placed at the end of the document so the pages load faster -->
<script src="/gzero/admin/js/ckeditor/ckeditor.js"></script>
<script src="/gzero/admin/js/vendor.min.js"></script>
<script src="/gzero/admin/js/admin.js"></script>
@foreach ($modules->getModulesPaths() as $modulePath)
    <script src="{{ $modulePath }}"></script>
@endforeach
</body>
</html>
