import React from 'react';
import { Link } from 'react-router-dom';

export const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden flex-1">
        <div className="absolute inset-0 mesh-gradient"></div>
        <div className="hero-pattern absolute inset-0"></div>
        <div className="relative max-w-7xl mx-auto container-padding section-padding">
          <div className="text-center">
            {/* Main Hero Content */}
            <div className="mb-8 relative animate-scale-in">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-600/20 rounded-3xl blur-3xl"></div>
              <img
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=120&h=120&fit=crop&crop=center"
                alt="CodeLadder"
                className="relative w-24 h-24 mx-auto rounded-2xl shadow-2xl object-cover border-4 border-white transform hover:scale-110 transition-all duration-500"
              />
            </div>
            <h1 className="section-header animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Level Up With <span className="text-gradient block mt-2">CodeLadder</span>
            </h1>
            <p className="section-subheader mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Join thousands of competitive programmers using our platform to collaborate, upsolve, and share insights.
              <span className="font-semibold text-gray-900"> Practice smarter, upsolve faster, achieve more.</span>
            </p>
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <Link to="/login" className="btn-primary px-8 py-3 text-lg rounded-full shadow-lg">
                Get Started
              </Link>
              <Link to="/ladders" className="btn-secondary px-8 py-3 text-lg rounded-full">
                Explore Ladders
              </Link>
              <Link to="/contest" className="btn-secondary px-8 py-3 text-lg rounded-full">
                Codeforces Upsolver
              </Link>
              <Link to="/codechef" className="btn-secondary px-8 py-3 text-lg rounded-full">
                CodeChef Upsolver
              </Link>
              <Link to="/leetcode" className="btn-secondary px-8 py-3 text-lg rounded-full">
                Leetcode Upsolver
              </Link>
            </div>
          </div>
        </div>
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200/30 rounded-full animate-float-gentle"></div>
        <div className="absolute top-40 right-20 w-12 h-12 bg-purple-200/30 rounded-full animate-float-gentle" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-indigo-200/30 rounded-full animate-float-gentle" style={{ animationDelay: '2s' }}></div>
      </section>

      {/* Features Section */}
      <section className="section-padding bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto container-padding">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to <span className="text-gradient">Excel</span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed max-w-3xl mx-auto">
              Comprehensive tools and features designed to accelerate your competitive programming journey
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Problem Set */}
            <Link to="/problemset" className="group card hover:scale-105 transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-code text-white text-xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Problem Set</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Access thousands of curated coding problems with detailed solutions and explanations.
              </p>
              <div className="flex items-center text-blue-600 font-semibold group-hover:text-blue-700">
                <span>Start Solving</span>
                <i className="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
              </div>
            </Link>

            {/* Dynamic Ladders */}
            <Link to="/ladders" className="group card hover:scale-105 transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-layer-group text-white text-xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Dynamic Ladders</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Create, share, and collaborate on problem ladders with friends and study groups.
              </p>
              <div className="flex items-center text-purple-600 font-semibold group-hover:text-purple-700">
                <span>Create Ladder</span>
                <i className="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
              </div>
            </Link>

            {/* Contest Upsolvers */}
            <Link to="/contest" className="group card hover:scale-105 transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-trophy text-white text-xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Contest Upsolvers</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Upsolve Codeforces, CodeChef, and LeetCode contests with organized problem tracking.
              </p>
              <div className="flex items-center text-orange-600 font-semibold group-hover:text-orange-700">
                <span>Start Upsolving</span>
                <i className="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
              </div>
            </Link>

            {/* Progress Calendar */}
            <Link to="/calendar" className="group card hover:scale-105 transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-calendar-alt text-white text-xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Progress Calendar</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Visualize your coding journey with GitHub-style contribution calendar and detailed analytics.
              </p>
              <div className="flex items-center text-green-600 font-semibold group-hover:text-green-700">
                <span>View Progress</span>
                <i className="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
              </div>
            </Link>

            {/* CodeChef Integration */}
            <Link to="/codechef" className="group card hover:scale-105 transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-pepper-hot text-white text-xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900">CodeChef Contests</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Track your progress across CodeChef contests with detailed problem statistics.
              </p>
              <div className="flex items-center text-red-600 font-semibold group-hover:text-red-700">
                <span>Explore CodeChef</span>
                <i className="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
              </div>
            </Link>

            {/* LeetCode Integration */}
            <Link to="/leetcode" className="group card hover:scale-105 transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <i className="fab fa-leetcode text-white text-xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900">LeetCode Contests</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Master LeetCode contests with organized problem tracking and difficulty analysis.
              </p>
              <div className="flex items-center text-yellow-600 font-semibold group-hover:text-yellow-700">
                <span>Explore LeetCode</span>
                <i className="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Welcome Section */}
      <section className="section-padding bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-gray-100">
        <div className="max-w-5xl mx-auto text-center container-padding">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-gradient">CodeLadder</span>
          </h2>
          <p className="text-gray-700 text-lg leading-relaxed mb-6">
            This project is a prototype of what I call the <strong>Dynamic Ladder</strong>.
          </p>
          <p className="text-gray-600 leading-relaxed mb-6">
            Ever wanted to share a list of coding questions with friends or collaborate on building a problem ladder? 
            While tools like Google Sheets or Docs can be used, they often feel clunky and repetitive.
          </p>
          <p className="text-gray-600 leading-relaxed mb-6">
            <strong>CodeLadder</strong> makes collaboration easy—track questions, avoid duplicates, and enjoy a much better UI experience. 
            Whether you're studying solo or with a team, this tool helps you organize, share, and solve more efficiently.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-6 py-4 text-yellow-800 mb-4">
            <strong>Please note:</strong> Some operations might take a couple of seconds to respond. We recommend waiting 1–2 seconds before attempting another update.
          </div>
          <p className="text-gray-500 mt-6">
            For any bugs, issues, or suggestions, feel free to reach out at <a className="underline" href="mailto:methodactorme@gmail.com">methodactorme@gmail.com</a>.
          </p>
          <p className="mt-4 font-semibold text-blue-700">Happy Coding! 🚀</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 bg-gradient-to-r from-gray-50 to-blue-50 text-center border-t border-gray-100 mt-auto">
        <div className="text-gray-700 text-sm">
          made with <span className="text-red-500">♥</span> by Deepanshu Soni - IIIT Allahabad
        </div>
      </footer>
    </div>
  );
}

export default Home;