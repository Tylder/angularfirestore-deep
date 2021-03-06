'use strict';


customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">angularfirestore-deep documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                        <li class="link">
                            <a href="overview.html" data-type="chapter-link">
                                <span class="icon ion-ios-keypad"></span>Overview
                            </a>
                        </li>
                        <li class="link">
                            <a href="index.html" data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>README
                            </a>
                        </li>
                        <li class="link">
                            <a href="license.html"  data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>LICENSE
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                    </ul>
                </li>
                    <li class="chapter additional">
                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#additional-pages"'
                            : 'data-target="#xs-additional-pages"' }>
                            <span class="icon ion-ios-book"></span>
                            <span>Additional documentation</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="additional-pages"' : 'id="xs-additional-pages"' }>
                                    <li class="link ">
                                        <a href="additional-documentation/introduction.html" data-type="entity-link" data-context-id="additional">Introduction</a>
                                    </li>
                                    <li class="chapter inner">
                                        <a data-type="chapter-link" href="additional-documentation/actions.html" data-context-id="additional">
                                            <div class="menu-toggler linked" data-toggle="collapse" ${ isNormalMode ?
                                            'data-target="#additional-page-cde0e8dcb3b8f73434ddd09aa74f6c26"' : 'data-target="#xs-additional-page-cde0e8dcb3b8f73434ddd09aa74f6c26"' }>
                                                <span class="link-name">Actions</span>
                                                <span class="icon ion-ios-arrow-down"></span>
                                            </div>
                                        </a>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="additional-page-cde0e8dcb3b8f73434ddd09aa74f6c26"' : 'id="xs-additional-page-cde0e8dcb3b8f73434ddd09aa74f6c26"' }>
                                            <li class="link for-chapter2">
                                                <a href="additional-documentation/actions/read.html" data-type="entity-link" data-context="sub-entity" data-context-id="additional">Read</a>
                                            </li>
                                            <li class="link for-chapter2">
                                                <a href="additional-documentation/actions/write.html" data-type="entity-link" data-context="sub-entity" data-context-id="additional">Write</a>
                                            </li>
                                            <li class="link for-chapter2">
                                                <a href="additional-documentation/actions/update.html" data-type="entity-link" data-context="sub-entity" data-context-id="additional">Update</a>
                                            </li>
                                            <li class="link for-chapter2">
                                                <a href="additional-documentation/actions/delete.html" data-type="entity-link" data-context="sub-entity" data-context-id="additional">Delete</a>
                                            </li>
                                            <li class="link for-chapter2">
                                                <a href="additional-documentation/actions/edit-name.html" data-type="entity-link" data-context="sub-entity" data-context-id="additional">Edit Name</a>
                                            </li>
                                        </ul>
                                    </li>
                        </ul>
                    </li>
                    <li class="chapter modules">
                        <a data-type="chapter-link" href="modules.html">
                            <div class="menu-toggler linked" data-toggle="collapse" ${ isNormalMode ?
                                'data-target="#modules-links"' : 'data-target="#xs-modules-links"' }>
                                <span class="icon ion-ios-archive"></span>
                                <span class="link-name">Modules</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                        </a>
                        <ul class="links collapse " ${ isNormalMode ? 'id="modules-links"' : 'id="xs-modules-links"' }>
                            <li class="link">
                                <a href="modules/AngularFirestoreDeepModule.html" data-type="entity-link">AngularFirestoreDeepModule</a>
                            </li>
                </ul>
                </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#classes-links"' :
                            'data-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/AngularFirestoreDeep.html" data-type="entity-link">AngularFirestoreDeep</a>
                            </li>
                            <li class="link">
                                <a href="classes/SubCollectionQuery.html" data-type="entity-link">SubCollectionQuery</a>
                            </li>
                            <li class="link">
                                <a href="classes/SubCollectionWriter.html" data-type="entity-link">SubCollectionWriter</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#interfaces-links"' :
                            'data-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/AddDocumentWrapper.html" data-type="entity-link">AddDocumentWrapper</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CurrentDocSubCollectionSplit.html" data-type="entity-link">CurrentDocSubCollectionSplit</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/DbItemFull.html" data-type="entity-link">DbItemFull</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FirebaseDbItem.html" data-type="entity-link">FirebaseDbItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FirestoreItem.html" data-type="entity-link">FirestoreItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FirestoreItemFullWithIndex.html" data-type="entity-link">FirestoreItemFullWithIndex</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FirestoreItemWithIndex.html" data-type="entity-link">FirestoreItemWithIndex</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ImageItem.html" data-type="entity-link">ImageItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StorageItem.html" data-type="entity-link">StorageItem</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#miscellaneous-links"'
                            : 'data-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/enumerations.html" data-type="entity-link">Enums</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});